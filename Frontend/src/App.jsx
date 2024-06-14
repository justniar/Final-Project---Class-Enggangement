import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';

import './App.css';

function App() {
  const [predictedClass, setPredictedClass] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Load face-api models
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        console.log("Models loaded successfully");
        startFaceDetection();
      } catch (error) {
        console.error("Error loading models:", error);
      }
    };

    loadModels();

    // Start the video stream when the component mounts
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => console.error("Error accessing webcam: ", err));
  }, []);

  const startFaceDetection = async () => {
    if (!canvasRef.current || !videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    try {
      setInterval(async () => {
        const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());

        if (detections) {
          const { x, y, width, height } = detections.box;

          canvas.width = width;
          canvas.height = height;
          context.drawImage(video, x, y, width, height, 0, 0, width, height);

          const faceImage = context.getImageData(0, 0, width, height);
          predictExpressionOnFrame(faceImage);
        }
      }, 100); // Adjust the interval as needed
    } catch (error) {
      console.error("Error detecting face:", error);
    }
  };

  const predictExpressionOnFrame = async (faceImage) => {
    const canvas = document.createElement('canvas');
    canvas.width = faceImage.width;
    canvas.height = faceImage.height;
    const context = canvas.getContext('2d');
    context.putImageData(faceImage, 0, 0);

    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('frame', blob, 'frame.jpg');

      try {
        const response = await axios.post('http://localhost:5000/predict', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setPredictedClass(response.data.predicted_class);
      } catch (error) {
        console.error("Error predicting frame:", error);
      }
    }, 'image/jpeg');
  };

  return (
    <>
      {predictedClass !== null && (
        <p>Predicted Class: {predictedClass}</p>
      )}
      <div className="video-container">
        <video ref={videoRef} autoPlay playsInline></video>
        <canvas ref={canvasRef}></canvas>
      </div>
    </>
  );
}

export default App;
