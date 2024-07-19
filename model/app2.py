import os
import io
import csv
import numpy as np
import base64
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
from tensorflow.keras.losses import SparseCategoricalCrossentropy
import tensorflow as tf
import psycopg2
import logging
import cv2
from sqlalchemy import create_engine, Column, Integer, String, LargeBinary
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

app = Flask(__name__)
CORS(app)

class CustomSparseCategoricalCrossentropy(SparseCategoricalCrossentropy):
    def __init__(self, from_logits=False):
        super().__init__(from_logits=from_logits, reduction='none', name='custom_sparse_categorical_crossentropy')

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

# Define the list of names (IDs)
names = ['None', 'Shendi', 'Abah', 'Hansohee', 'Jokowi', 'Bill Gates', 'Elon Musk', 'Salsa']

# Custom loss function definition
class CustomSparseCategoricalCrossentropy(tf.keras.losses.Loss):
    def call(self, y_true, y_pred):
        return tf.keras.losses.sparse_categorical_crossentropy(y_true, y_pred)

# Load the model
try:
    expression_recognition_model = load_model(model_path, custom_objects={'CustomSparseCategoricalCrossentropy': CustomSparseCategoricalCrossentropy()})
    print("Model loaded successfully.")
except FileNotFoundError as e:
    print(f"Error: {e}")
    print("Make sure the model file exists and the path is correct.")

# Database connection details
DATABASE_URL = "postgresql://postgres:postgres@localhost/engagement_db"
# engine = create_engine(DATABASE_URL)
# Base = declarative_base()

# class Face(Base):
#     __tablename__ = 'faces'
#     id = Column(Integer, primary_key=True)
#     user_id = Column(String, nullable=False)
#     descriptor = Column(LargeBinary, nullable=False)

# Base.metadata.create_all(engine)
# Session = sessionmaker(bind=engine)
# session = Session()

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

        print(expression_predicted_class_label)

        return jsonify({
            'expression_predicted_class_label': expression_predicted_class_label
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
        path = 'captured_images'
        recognizer = cv2.face.LBPHFaceRecognizer_create()
        detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

        def get_image_and_labels(path):
            image_paths = []
            for user_id in os.listdir(path):
                user_dir = os.path.join(path, user_id)
                if os.path.isdir(user_dir):
                    for filename in os.listdir(user_dir):
                        if filename.endswith('.png'):
                            image_paths.append(os.path.join(user_dir, filename))

            face_samples = []
            ids = []

            if len(image_paths) == 0:
                raise ValueError("No images found in the directory. Ensure images are placed in the 'captured_images' directory.")

            for image_path in image_paths:
                print(f"Processing image: {image_path}")
                try:
                    PIL_img = Image.open(image_path).convert('L')
                    img_numpy = np.array(PIL_img, 'uint8')
                    print(f"Image shape: {img_numpy.shape}")

                    id = int(os.path.split(image_path)[-1].split(".")[0])
                    faces = detector.detectMultiScale(img_numpy, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

                    if len(faces) == 0:
                        print(f"No faces detected in image: {image_path}")
                    else:
                        for (x, y, w, h) in faces:
                            # Ensure coordinates are within bounds
                            if x >= 0 and y >= 0 and x + w <= img_numpy.shape[1] and y + h <= img_numpy.shape[0]:
                                face_samples.append(img_numpy[y:y+h, x:x+w])
                                ids.append(id)
                                print(f"Detected face in image: {image_path}, ID: {id}")
                            else:
                                print(f"Face coordinates out of bounds in image: {image_path}")

                except Exception as e:
                    print(f"Error processing image {image_path}: {e}")

            return face_samples, ids

        faces, ids = get_image_and_labels(path)
        if len(faces) == 0 or len(ids) == 0:
            raise ValueError("No faces or IDs detected. Ensure you have properly labeled images with faces.")

        recognizer.train(faces, np.array(ids))
        recognizer.write('trainer/trainer.yml')

        return jsonify({'message': 'Training completed successfully', 'total_ids': len(np.unique(ids))})
    except Exception as e:
        logging.error(f"Error during training: {str(e)}")
        return jsonify({'message': 'Failed to complete training', 'error': str(e)}), 500

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

        for (x, y, w, h) in faces:
            id, confidence = recognizer.predict(img[y:y+h, x:x+w])
            confidence = round(100 - confidence)

            if confidence > 50:
                user_id = id
            else:
                user_id = 'unknown'

        return jsonify({'user_id': user_id, 'confidence': confidence})
    except Exception as e:
        logging.error(f"Error identifying user: {str(e)}")
        return jsonify({'message': 'Failed to identify user', 'error': str(e)}), 500

@app.route('/save_face', methods=['POST'])
def save_face():
    data = request.json
    user_id = data['user_id']
    descriptor = np.array(data['descriptor'], dtype=np.float32).tobytes()
    
    # Save the image info to the captures table
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO captures (label, src) VALUES (%s, %s)",
        (user_id, os.path.join(user_id, descriptor))
    )
    conn.commit()
    cur.close()
    conn.close()

    with open(f'labeled_descriptors/{user_id}.json', 'w') as f:
        json.dump(descriptor, f)

    return jsonify({'message': 'Descriptor saved successfully'}), 200
    
@app.route('/get_faces', methods=['GET'])
def get_faces():
    faces = session.query(Face).all()
    result = []
    for face in faces:
        result.append({
            'user_id': face.user_id,
            'descriptor': np.frombuffer(face.descriptor, dtype=np.float32).tolist()
        })
    return jsonify(result), 200

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    app.run(debug=True)
