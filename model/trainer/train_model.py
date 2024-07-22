import cv2
import numpy as np
from PIL import Image
import os

def train_model(image_dir='captured_images', output_model='trainer/trainer.yml'):
    # Initialize face recognizer and detector
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    def get_images_and_labels(base_path):
        face_samples = []
        ids = []
        
        # Walk through all subdirectories
        for root, dirs, files in os.walk(base_path):
            for file in files:
                if file.endswith('.png') or file.endswith('.jpg') or file.endswith('.jpeg'):
                    image_path = os.path.join(root, file)
                    
                    try:
                        PIL_img = Image.open(image_path).convert('L')
                        img_numpy = np.array(PIL_img, 'uint8')
                        
                        id = int(os.path.split(root)[-1])  # Assuming the folder name is the ID
                        faces = detector.detectMultiScale(img_numpy)
                        
                        for (x, y, w, h) in faces:
                            face_samples.append(img_numpy[y:y+h, x:x+w])
                            ids.append(id)
                    except Exception as e:
                        print(f"Error processing {image_path}: {e}")
                
        return face_samples, ids

    print("[INFO] Training model, please wait...")
    faces, ids = get_images_and_labels(image_dir)
    recognizer.train(faces, np.array(ids))
    recognizer.write(output_model)
    print(f"\n[INFO] Training complete. Model saved as {output_model} with total ID: {len(np.unique(ids))}")

if __name__ == "__main__":
    train_model()
