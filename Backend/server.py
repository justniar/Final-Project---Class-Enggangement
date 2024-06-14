from flask import Flask, request, jsonify
from tensorflow.keras.models import load_model
import numpy as np
from PIL import Image
import io

app = Flask(__name__)

# Load the Keras model
model = load_model('model/model_daisee_yawdd.h5')

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
        classes = ["engaged", "bored", "frustrated", "confused", "Closed", "Open", "no_yawn", "yawn"]
        result = classes[predicted_class]

        return jsonify({'predicted_class': result})

    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)
