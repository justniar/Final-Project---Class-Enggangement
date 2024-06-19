import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import './App.css';

function App() {
  const [predictedClass, setPredictedClass] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models')
        ]);
        console.log("Models loaded successfully");
        startVideo();
      } catch (error) {
        console.error("Error loading models:", error);
      }
    };

    const startVideo = () => {
      navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play();
              startFaceDetection();
            };
          }
        })
        .catch(err => console.error("Error accessing webcam: ", err));
    };

    loadModels();
  }, []);

  const startFaceDetection = async () => {
    if (!canvasRef.current || !videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

      if (resizedDetections.length > 0) {
        predictExpressionOnFrame(resizedDetections[0], canvas);
      }
    }, 100);
  };

  const predictExpressionOnFrame = async (detection, canvas) => {
    const { x, y, width, height } = detection.detection.box;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempContext = tempCanvas.getContext('2d');
    tempContext.drawImage(videoRef.current, x, y, width, height, 0, 0, width, height);

    tempCanvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('frame', blob, 'frame.jpg');

      try {
        const response = await axios.post('http://localhost:5000/predict', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const newPrediction = response.data.predicted_class;

        // Draw the predicted expression in a blue rectangle above the bounding box
        const context = canvas.getContext('2d');
        context.fillStyle = 'blue';
        context.fillRect(x, y - 30, width, 25);  // Adjust rectangle size and position as needed
        context.font = '18px Arial';
        context.fillStyle = 'white';
        context.fillText(`Expression: ${newPrediction}`, x + 5, y - 10);

        setPredictions(prevPredictions => [...prevPredictions, { expression: newPrediction, time: new Date().toLocaleTimeString() }]);
      } catch (error) {
        console.error("Error predicting frame:", error);
      }
    }, 'image/jpeg');
  };

  return (
    <>
      <div className="video-container" style={{ position: 'relative' }}>
        <video ref={videoRef} width="720" height="560" style={{ position: 'absolute' }} autoPlay muted></video>
        <canvas ref={canvasRef} width="720" height="560" style={{ position: 'absolute' }}></canvas>
      </div>
      <table className="predictions-table" style={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'white', padding: '10px' }}>
        <thead>
          <tr>
            <th>Expression</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((prediction, index) => (
            <tr key={index}>
              <td>{prediction.expression}</td>
              <td>{prediction.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default App;
