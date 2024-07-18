# """
# Simple app to upload an image via a web form 
# and view the inference results on the image in the browser.
# """
# import argparse
# import io
# from PIL import Image
# import datetime

# import torch
# import cv2
# import numpy as np
# import tensorflow as tf
# from re import DEBUG, sub
# from flask import Flask, render_template, request, redirect, send_file, url_for, Response
# from werkzeug.utils import secure_filename, send_from_directory
# import os
# import subprocess
# from subprocess import Popen
# import re
# import requests
# import shutil
# import time

# app = Flask(__name__)

# @app.route("/")
# def hello_world():
#     return render_template('index.html')


# # function for accessing rtsp stream
# # @app.route("/rtsp_feed")
# # def rtsp_feed():
#     # cap = cv2.VideoCapture('rtsp://admin:hello123@192.168.29.126:554/cam/realmonitor?channel=1&subtype=0')
#     # return render_template('index.html')


# # Function to start webcam and detect objects

# # @app.route("/webcam_feed")
# # def webcam_feed():
#     # #source = 0
#     # cap = cv2.VideoCapture(0)
#     # return render_template('index.html')

# # function to get the frames from video (output video)

# def get_frame():
#     folder_path = 'runs/detect'
#     subfolders = [f for f in os.listdir(folder_path) if os.path.isdir(os.path.join(folder_path, f))]    
#     latest_subfolder = max(subfolders, key=lambda x: os.path.getctime(os.path.join(folder_path, x)))
#     filename = predict_img.imgpath    
#     image_path = folder_path+'/'+latest_subfolder+'/'+filename    
#     video = cv2.VideoCapture(image_path)  # detected video path
#     #video = cv2.VideoCapture("video.mp4")
#     while True:
#         success, image = video.read()
#         if not success:
#             break
#         ret, jpeg = cv2.imencode('.jpg', image)   
#         yield (b'--frame\r\n'
#                b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n\r\n')   
#         time.sleep(0.1)  #control the frame rate to display one frame every 100 milliseconds: 


# # function to display the detected objects video on html page
# @app.route("/video_feed")
# def video_feed():
#     return Response(get_frame(),
#                     mimetype='multipart/x-mixed-replace; boundary=frame')



# #The display function is used to serve the image or video from the folder_path directory.
# @app.route('/<path:filename>')
# def display(filename):
#     folder_path = 'runs/detect'
#     subfolders = [f for f in os.listdir(folder_path) if os.path.isdir(os.path.join(folder_path, f))]    
#     latest_subfolder = max(subfolders, key=lambda x: os.path.getctime(os.path.join(folder_path, x)))    
#     directory = folder_path+'/'+latest_subfolder
#     print("printing directory: ",directory)  
#     filename = predict_img.imgpath
#     file_extension = filename.rsplit('.', 1)[1].lower()
#     #print("printing file extension from display function : ",file_extension)
#     environ = request.environ
#     if file_extension == 'jpg':      
#         return send_from_directory(directory,filename,environ)

#     elif file_extension == 'mp4':
#         return render_template('index.html')

#     else:
#         return "Invalid file format"

    
# @app.route("/", methods=["GET", "POST"])
# def predict_img():
#     if request.method == "POST":
#         if 'file' in request.files:
#             f = request.files['file']
#             basepath = os.path.dirname(__file__)
#             filepath = os.path.join(basepath,'uploads',f.filename)
#             print("upload folder is ", filepath)
#             f.save(filepath)
            
#             predict_img.imgpath = f.filename
#             print("printing predict_img :::::: ", predict_img)

#             file_extension = f.filename.rsplit('.', 1)[1].lower()    
#             if file_extension == 'jpg':
#                 process = Popen(["python", "detect.py", '--source', filepath, "--weights","best.pt"], shell=True)
#                 process.wait()
                
                
#             elif file_extension == 'mp4':
#                 process = Popen(["python", "detect.py", '--source', filepath, "--weights","best.pt"], shell=True)
#                 process.communicate()
#                 process.wait()

            
#     folder_path = 'runs/detect'
#     subfolders = [f for f in os.listdir(folder_path) if os.path.isdir(os.path.join(folder_path, f))]    
#     latest_subfolder = max(subfolders, key=lambda x: os.path.getctime(os.path.join(folder_path, x)))    
#     image_path = folder_path+'/'+latest_subfolder+'/'+f.filename 
#     return render_template('index.html', image_path=image_path)
#     #return "done"



# if __name__ == "__main__":
#     parser = argparse.ArgumentParser(description="Flask app exposing yolov5 models")
#     parser.add_argument("--port", default=5000, type=int, help="port number")
#     args = parser.parse_args()
#     model = torch.hub.load('.', 'custom','best_246.pt', source='local')
#     model.eval()
#     app.run(host="0.0.0.0", port=args.port)  # debug=True causes Restarting with stat

# pip install opencv-python

# import cv2
# from ultralytics import YOLO

# model = YOLO('yolo-Weights/best.pt')
# print(model.names)
# webcamera = cv2.VideoCapture(0)
# # webcamera.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
# # webcamera.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

# while True:
#     success, frame = webcamera.read()
    
#     results = model.track(frame, classes=0, conf=0.8, imgsz=480)
#     cv2.putText(frame, f"Total: {len(results[0].boxes)}", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2, cv2.LINE_AA)
#     cv2.imshow("Live Camera", results[0].plot())

#     if cv2.waitKey(1) == ord('q'):
#         break

# webcamera.release()
# cv2.destroyAllWindows()


# Flask API (app.py)
from flask import Flask, request, jsonify
import cv2
import numpy as np
from ultralytics import YOLO
import logging

app = Flask(__name__)

# Load your YOLOv8 model
try:
    model = YOLO("best.pt")
    print("Model loaded successfully")
except Exception as e:
    print(f"Error loading model: {e}")
    exit()

def preprocess_image(image):
    # Convert the image to RGB format
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    # Resize the image to the input size of the model
    image = cv2.resize(image, (640, 640))
    return image

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
            cls = box.cls[0].item()      # Class

            predictions.append({
                'box': bbox,
                'confidence': conf,
                'class': cls
            })

    return jsonify(predictions), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

