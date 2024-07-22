import os
import io
import csv
import numpy as np
import base64
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import psycopg2
import logging
import cv2
import numpy as np
from ultralytics import YOLO
import subprocess

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

# Get the absolute path of the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))

# Construct the absolute path to the model file
model_path = os.path.join(current_dir, 'model', 'ClassEnggagementDetectionDrownsinessTune.h5')

# Load the recognizer and face detector
recognizer = cv2.face.LBPHFaceRecognizer_create()
recognizer.read('trainer/trainer.yml')
cascadePath = "haarcascade_frontalface_default.xml"
faceCascade = cv2.CascadeClassifier(cascadePath)

# Define the font for text on the image
font = cv2.FONT_HERSHEY_SIMPLEX
# Custom loss function definition

# Load your YOLOv8 model
try:
    model = YOLO("best.pt")
    print("Model loaded successfully")
except Exception as e:
    print(f"Error loading model: {e}")
    exit()
    
class_labels = ['bingung', 'bosan', 'fokus', 'frustasi', 'mengantuk', 'tidak-fokus']

DATABASE_URL = "postgresql://postgres:postgres@localhost/engagement_db"


def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL)
    return conn

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

        # Find the number of existing files
        existing_files = [f for f in os.listdir(image_save_path) if f.startswith(f'{user_id}.') and f.endswith('.png')]
        if len(existing_files) >= 20:
            return jsonify({'message': 'Maximum number of images captured'}), 400

        # Find the next available index for the image filename
        if existing_files:
            existing_indices = [int(f.split('.')[1]) for f in existing_files]
            next_index = max(existing_indices) + 1
        else:
            next_index = 1

        image_filename = f'{user_id}.{next_index}.png'
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

@app.route('/start-training', methods=['POST'])
def start_training():
    try:
        # Run the training script
        result = subprocess.run(['python', 'trainer/train_model.py'], capture_output=True, text=True)
        
        if result.returncode == 0:
            message = result.stdout
        else:
            message = result.stderr

        print("CompletedProcess:", result)
        print("Training Output:", message)

        return jsonify({'message': message}), 200
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

@app.route('/identify-user', methods=['POST'])
def identify_user():
    try:
        if 'frame' not in request.files:
            return jsonify({'error': 'No image part in the request'}), 400

        file = request.files['frame']
        img = Image.open(file.stream).convert('L')
        img = np.array(img, 'uint8')

        recognizer = cv2.face.LBPHFaceRecognizer_create()
        recognizer.read('trainer/trainer.yml')
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

        faces = face_cascade.detectMultiScale(img, scaleFactor=1.2, minNeighbors=5, minSize=(30, 30))

        if len(faces) == 0:
            return jsonify({'message': 'No faces detected'}), 400

        user_id = '200511101'
        confidence = 0

        for (x, y, w, h) in faces:
            id, conf = recognizer.predict(img[y:y+h, x:x+w])
            confidence = round(100 - conf)

            if confidence > 50:
                user_id = id

        return jsonify({'user_id': user_id, 'confidence': confidence}), 200
    
    except Exception as e:
        logging.error(f"Error identifying user: {str(e)}")
        return jsonify({'message': 'Failed to identify user', 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)