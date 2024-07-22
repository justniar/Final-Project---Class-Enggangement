from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

try:
    model = YOLO("best.pt")
    print("Model loaded successfully")
except Exception as e:
    print(f"Error loading model: {e}")
    exit()

class_labels = ['bingung', 'bosan', 'fokus', 'frustasi', 'mengantuk', 'tidak-fokus']

def preprocess_image(image):
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
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

    processed_image = preprocess_image(image)
    results = model(processed_image)

    predictions = []
    for result in results:
        for box in result.boxes:
            bbox = box.xyxy.tolist()[0]
            cls = int(box.cls.tolist()[0])
            confidence = box.conf.tolist()[0]

            predictions.append({
                'box': bbox,
                'class': class_labels[cls],
                'confidence': confidence
            })

    return jsonify(predictions), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
