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

# Load your model here
model_path = 'model/ClassEnggagementDetectionDrownsiness.h5'
model = load_model(model_path, custom_objects={'CustomSparseCategoricalCrossentropy': CustomSparseCategoricalCrossentropy()})

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Read the image from the request
        if 'frame' not in request.files:
            return jsonify({'error': 'No image part in the request'}), 400

        file = request.files['frame']
        img = Image.open(file.stream)
        img = img.resize((48, 48))
        img = np.array(img.convert('RGB'))  # Convert to RGB
        img = img / 255.0  # Normalize
        img = np.expand_dims(img, axis=0)

        predictions = model.predict(img)
        predicted_class = np.argmax(predictions)

        class_labels = ['Closed', 'Open', 'no_yawn', 'yawn']
        predicted_class_label = class_labels[predicted_class]

        return jsonify({'predicted_class': predicted_class_label})
    except Exception as e:
        logging.error(f"Error processing prediction: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    app.run(debug=True)
