# Flask API (app.py)

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

# Load your YOLOv8 model
try:
    model = YOLO("best.pt")
    print("Model loaded successfully")
except Exception as e:
    print(f"Error loading model: {e}")
    exit()
    
class_labels = ['bingung', 'bosan', 'fokus', 'frustasi', 'mengantuk', 'tidak-fokus']

def preprocess_image(image):
    # Convert the image to RGB format
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    # Resize the image to the input size of the model
    image = cv2.resize(image, (640, 640))
    return image

@app.route('/test', methods=['GET'])
def test():
    return jsonify({'message': 'Server is running'}), 200

@app.route('/predict', methods=['POST'])
def predict():
    if 'frame' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['frame']
    image = np.frombuffer(file.read(), np.uint8)
    image = cv2.imdecode(image, cv2.IMREAD_COLOR)

    # Preprocess the image
    processed_image = preprocess_image(image)

    # Perform prediction
    results = model(processed_image)

    # Extract predictions
    predictions = []
    for result in results:
        for box in result.boxes:
            bbox = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
            conf = box.conf[0].item()    # Confidence score
            cls = box.cls[0].item()      # Class index

            predictions.append({
                'box': bbox,
                'confidence': conf,
                'class': class_labels[int(cls)]  # Map class index to label
            })

    return jsonify(predictions), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
