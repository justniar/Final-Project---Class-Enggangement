from flask import Flask, request, jsonify
import cv2
import numpy as np
from tensorflow.keras.models import load_model
import os

app = Flask(__name__)

# Load the Keras model
model_path = 'model_daisee_yawdd.h5'  # Update this path if necessary
if not os.path.exists(model_path):
    print(f"Error: Model file {model_path} does not exist.")
    exit()

try:
    model = load_model(model_path)
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    exit()

def preprocess_frame(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, (48, 48))
    normalized = resized / 255.0
    reshaped = np.reshape(normalized, (1, 48, 48, 1))
    return reshaped

@app.route('/predict', methods=['POST'])
def predict():
    if 'frame' not in request.files:
        return jsonify({"error": "No frame provided"}), 400

    frame_file = request.files['frame']
    frame_array = np.frombuffer(frame_file.read(), np.uint8)
    frame = cv2.imdecode(frame_array, cv2.IMREAD_COLOR)
    
    preprocessed_frame = preprocess_frame(frame)
    prediction = model.predict(preprocessed_frame)
    predicted_class = np.argmax(prediction)

    return jsonify({"predicted_class": int(predicted_class)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
