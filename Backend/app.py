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
import psycopg2
import logging
import cv2 

app = Flask(__name__)
CORS(app)

class CustomSparseCategoricalCrossentropy(SparseCategoricalCrossentropy):
    def __init__(self, from_logits=False):
        super().__init__(from_logits=from_logits, reduction='none', name='custom_sparse_categorical_crossentropy')

# Load your models here
expression_recognition_model_path = 'model/ClassEnggagementDetectionDrownsinessTune.h5'
expression_recognition_model = load_model(expression_recognition_model_path, custom_objects={'CustomSparseCategoricalCrossentropy': CustomSparseCategoricalCrossentropy()})

# Database connection details
DATABASE_URL = "postgresql://postgres:postgres@localhost/engagement_db"

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

        # Save prediction to the database
        # nim = 200511152

        # if nim:
        #     conn = get_db_connection()
        #     cur = conn.cursor()
        #     cur.execute(
        #         "INSERT INTO detections (nim, expression) VALUES (%s, %s)",
        #         (nim, expression_predicted_class_label)
        #     )
        #     conn.commit()
        #     cur.close()
        #     conn.close()

        return jsonify({
            'expression_predicted_class': expression_predicted_class_label
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

        #  # Save the user ID to the CSV file
        # csv_file_path = 'user_id.csv'
        # user_ids = []

        # if os.path.isfile(csv_file_path):
        #     with open(csv_file_path, mode='r') as csv_file:
        #         csv_reader = csv.reader(csv_file)
        #         for row in csv_reader:
        #             user_ids.extend(row)

        # user_ids.append(user_id)

        # with open(csv_file_path, mode='w', newline='') as csv_file:
        #     csv_writer = csv.writer(csv_file)
        #     csv_writer.writerow(user_ids)

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

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    app.run(debug=True)
