import os
import io
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
from tensorflow.keras.losses import SparseCategoricalCrossentropy
import logging

app = Flask(__name__)
CORS(app)

class CustomSparseCategoricalCrossentropy(SparseCategoricalCrossentropy):
    def __init__(self, from_logits=False):
        super().__init__(from_logits=from_logits, reduction='none', name='custom_sparse_categorical_crossentropy')

# Load your models here
user_recognition_model_path = 'model/ClassEnggagementDetectionDrownsinessTune.h5'
expression_recognition_model_path = 'model/ClassEnggagementDetectionDrownsinessTune.h5'

user_recognition_model = load_model(user_recognition_model_path, custom_objects={'CustomSparseCategoricalCrossentropy': CustomSparseCategoricalCrossentropy()})
expression_recognition_model = load_model(expression_recognition_model_path, custom_objects={'CustomSparseCategoricalCrossentropy': CustomSparseCategoricalCrossentropy()})

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

        # User recognition prediction
        user_predictions = user_recognition_model.predict(img)
        user_predicted_class = np.argmax(user_predictions)

        # Expression recognition prediction
        expression_predictions = expression_recognition_model.predict(img)
        expression_predicted_class = np.argmax(expression_predictions)

        # Define class labels
        user_class_labels = ['User1', 'User2', 'User3']  # Replace with actual user labels
        expression_class_labels = ['Closed', 'Open', 'no_yawn', 'yawn']

        user_predicted_class_label = user_class_labels[user_predicted_class]
        expression_predicted_class_label = expression_class_labels[expression_predicted_class]
        
        # Map the predicted class label to "fokus" or "mengantuk"
        if expression_predicted_class_label in ['Open', 'no_yawn']:
            expression_predicted_class_label = 'fokus'
        elif expression_predicted_class_label in ['Closed', 'yawn']:
            expression_predicted_class_label = 'mengantuk'

        return jsonify({
            # 'user_predicted_class': user_predicted_class_label,
            'user_predicted_class': 'salsa',
            'expression_predicted_class': expression_predicted_class_label
        })
    except Exception as e:
        logging.error(f"Error processing prediction: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    app.run(debug=True)
