from flask import Flask, Response, jsonify
import cv2
import numpy as np
from tensorflow.keras.models import load_model
import threading

app = Flask(__name__)

# Load the Keras model
try:
    model = load_model('model/model_daisee_yawdd.h5')
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    exit()

# Global variables for webcam
cap = None
capture_thread = None
frame = None
is_capturing = False

def preprocess_frame(frame):
    """Preprocess the frame to be suitable for prediction."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, (48, 48))
    normalized = resized / 255.0
    reshaped = np.reshape(normalized, (1, 48, 48, 1))
    return reshaped

def capture_frames():
    global cap, frame, is_capturing
    while is_capturing:
        ret, frame = cap.read()
        if not ret:
            break

@app.route('/start_capture', methods=['GET'])
def start_capture():
    global cap, capture_thread, is_capturing
    if is_capturing:
        return jsonify({"error": "Capture already started"}), 400
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        return jsonify({"error": "Could not open webcam"}), 500

    is_capturing = True
    capture_thread = threading.Thread(target=capture_frames)
    capture_thread.start()
    
    return jsonify({"message": "Capture started"}), 200

@app.route('/stop_capture', methods=['GET'])
def stop_capture():
    global cap, capture_thread, is_capturing
    if not is_capturing:
        return jsonify({"error": "Capture not started"}), 400
    
    is_capturing = False
    capture_thread.join()
    cap.release()
    cap = None
    
    return jsonify({"message": "Capture stopped"}), 200

@app.route('/predict', methods=['GET'])
def predict():
    global frame
    if frame is None:
        return jsonify({"error": "No frame captured"}), 400
    
    preprocessed_frame = preprocess_frame(frame)
    prediction = model.predict(preprocessed_frame)
    predicted_class = np.argmax(prediction)
    
    return jsonify({"predicted_class": int(predicted_class)})

@app.route('/video_feed')
def video_feed():
    """Video streaming route. Put this in the src attribute of an img tag."""
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

def gen_frames():
    """Generate frames from the webcam for streaming."""
    global frame
    while is_capturing:
        if frame is None:
            continue
        
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
