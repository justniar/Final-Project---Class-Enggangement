import os
import io
import numpy as np
import base64
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
from tensorflow.keras.losses import SparseCategoricalCrossentropy
import psycopg2
import logging

app = Flask(__name__)
CORS(app)

class CustomSparseCategoricalCrossentropy(SparseCategoricalCrossentropy):
    def __init__(self, from_logits=False):
        super().__init__(from_logits=from_logits, reduction='none', name='custom_sparse_categorical_crossentropy')

# Load your models here
expression_recognition_model_path = 'model/ClassEnggagementDetectionDrownsinessTune.h5'

expression_recognition_model = load_model(expression_recognition_model_path, custom_objects={'CustomSparseCategoricalCrossentropy': CustomSparseCategoricalCrossentropy()})

# Database connection details
DATABASE_URL = "postgresql://postgres:postgres@localhost/engagement_db"

def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL)
    return conn

@app.route('/predict', methods=['POST'])
def predict():
    try:
        if 'frame' not in request.files:
            return jsonify({'error': 'No image part in the request'}), 400

        file = request.files['frame']
        img = Image.open(file.stream)
        img = img.resize((48, 48))
        img = np.array(img.convert('RGB'))  # Convert to RGB
        img = img / 255.0  # Normalize
        img = np.expand_dims(img, axis=0)

        # Expression recognition prediction
        expression_predictions = expression_recognition_model.predict(img)
        expression_predicted_class = np.argmax(expression_predictions)

        # Define class labels
        expression_class_labels = ['Closed', 'Open', 'no_yawn', 'yawn']
        expression_predicted_class_label = expression_class_labels[expression_predicted_class]

        # save prediction to the database
        nim = 200511152

        if nim: 
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute(
                    "INSERT INTO detections (nim, expression) VALUES (%s, %s)",
                    (nim, expression_predicted_class_label)
                )
            conn.commit()
            cur.close()
            conn.close()
        
        return jsonify({
            'expression_predicted_class': expression_predicted_class_label
        })
    except Exception as e:
        logging.error(f"Error processing prediction: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@app.route('/capture', methods=['POST'])
def capture_image():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        image_data = data.get('image')

        # Convert image data from base64
        image = Image.open(io.BytesIO(base64.b64decode(image_data.split(',')[1])))

        # Save the image to a file
        image_save_path = f'./captured_images/{user_id}'
        os.makedirs(image_save_path, exist_ok=True)
        image_filename = f'{user_id}.png'
        image.save(os.path.join(image_save_path, image_filename))

        # Save the image info to the captures table
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO captures (label, src) VALUES (%s, %s)",
            (user_id, os.path.join(image_save_path, image_filename))
        )
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'message': 'Image captured and saved successfully'})
    except Exception as e:
        logging.error(f"Error capturing image: {e}")
        return jsonify({'message': 'Failed to capture image'}), 500
    
if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    app.run(debug=True)
