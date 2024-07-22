from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

# Load YOLO face model
try:
    face_model = YOLO("yolov8n-face.pt")
    print("YOLO face model loaded successfully")
except Exception as e:
    print(f"Error loading YOLO face model: {e}")
    exit()

# Load YOLO emotion recognition model
try:
    emotion_model = YOLO("best.pt")
    print("YOLO emotion model loaded successfully")
except Exception as e:
    print(f"Error loading YOLO emotion model: {e}")
    exit()

class_labels = ['bingung', 'bosan', 'fokus', 'frustasi', 'mengantuk', 'tidak-fokus']

def preprocess_image(image):
    # Convert the image to RGB
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

@app.route('/test', methods=['GET'])
def test():
    return jsonify({'message': 'Server is running'}), 200

@app.route('/detect_faces', methods=['POST'])
def detect_faces():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400

    file = request.files['video']
    file.save('temp_video.mp4')

    # Load video
    cap = cv2.VideoCapture('temp_video.mp4')
    face_images = []
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Detect faces
        processed_image = preprocess_image(frame)
        face_results = face_model(processed_image)

        for result in face_results:
            for box in result.boxes:
                bbox = box.xyxy.tolist()[0]
                confidence = box.conf.tolist()[0]

                if confidence >= 0.2:
                    x1, y1, x2, y2 = map(int, bbox)
                    face = frame[y1:y2, x1:x2]
                    _, buffer = cv2.imencode('.jpg', face)
                    face_images.append(face)

    cap.release()
    return jsonify({'message': 'Faces detected', 'face_count': len(face_images)}), 200

@app.route('/recognize_expressions', methods=['POST'])
def recognize_expressions():
    if not request.files or 'face_images' not in request.files:
        return jsonify({'error': 'No face images provided'}), 400

    files = request.files.getlist('face_images')
    predictions = []

    for file in files:
        image = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(image, cv2.IMREAD_COLOR)
        processed_image = preprocess_image(image)
        results = emotion_model(processed_image)

        for result in results:
            for box in result.boxes:
                bbox = box.xyxy.tolist()[0]
                cls = int(box.cls.tolist()[0])
                confidence = box.conf.tolist()[0]

                if confidence >= 0.2:
                    predictions.append({
                        'box': bbox,
                        'class': class_labels[cls],
                        'confidence': confidence
                    })

    return jsonify(predictions), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
