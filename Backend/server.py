from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
from tensorflow.keras.losses import SparseCategoricalCrossentropy
import tensorflow as tf
import numpy as np
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

# Custom SparseCategoricalCrossentropy to handle the unexpected argument
class CustomSparseCategoricalCrossentropy(SparseCategoricalCrossentropy):
    def __init__(self, from_logits=False, reduction='auto', name='sparse_categorical_crossentropy'):
        super().__init__(from_logits=from_logits, reduction=reduction, name=name)

    def __call__(self, y_true, y_pred):
        return super().__call__(y_true, y_pred)

# Load the Keras model with custom loss function
model = load_model('model/ClassEnggagementDetectionDrownsiness.h5')

# Define a route for the prediction
@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get the image file from the request
        file = request.files['frame'].read()
        image = Image.open(io.BytesIO(file))

        # Convert the image to grayscale and resize to 48x48
        image = image.convert('L')
        image = image.resize((48, 48))

        # Convert to numpy array and normalize
        img_array = np.array(image) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        img_array = np.expand_dims(img_array, axis=-1)

        # Make prediction
        prediction = model.predict(img_array)
        predicted_class = np.argmax(prediction)

        # Define class labels
        classes = ["Closed", "Open", "no_yawn", "yawn"]
        result = classes[predicted_class]

        return jsonify({'predicted_class': result})

    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)
