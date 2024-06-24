import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';

function App() {
  const [predictedUser, setPredictedUser] = useState(null);
  const [predictedExpression, setPredictedExpression] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [isWebcamActive, setIsWebcamActive] = useState(true);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lastPredictionRef = useRef(null);

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

    loadModels();
  }, []);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: {} })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            videoRef.current.width = videoRef.current.videoWidth;
            videoRef.current.height = videoRef.current.videoHeight;
            startFaceDetection();
          };
        }
      })
      .catch(err => console.error("Error accessing webcam: ", err));
  };
  

  const startFaceDetection = async () => {
    if (!canvasRef.current || !videoRef.current) return;
  
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);
  
    const intervalId = setInterval(async () => {
      if (!isWebcamActive) {
        clearInterval(intervalId);
        return;
      }
  
      const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
  
      if (resizedDetections.length > 0) {
        predictOnFrame(resizedDetections[0], canvas);
      }
    }, 100);
  };  

  const predictOnFrame = async (detection, canvas) => {
    const { x, y, width, height } = detection.detection.box;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempContext = tempCanvas.getContext('2d', { willReadFrequently: true });
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

        const { user_predicted_class, expression_predicted_class } = response.data;

        if (expression_predicted_class !== lastPredictionRef.current) {
          lastPredictionRef.current = expression_predicted_class;

          const context = canvas.getContext('2d', { willReadFrequently: true });  
          context.fillStyle = 'blue';
          context.fillRect(x, y - 50, width, 50); 
          context.font = '18px Arial';
          context.fillStyle = 'white';
          context.fillText(`User: ${user_predicted_class}`, x + 5, y - 30);
          context.fillText(`Expression: ${expression_predicted_class}`, x + 5, y - 10);

          setPredictions(prevPredictions => [...prevPredictions, { user: user_predicted_class, expression: expression_predicted_class, time: new Date().toLocaleTimeString() }]);
        }
      } catch (error) {
        console.error("Error predicting frame:", error);
      }
    }, 'image/jpeg');
  };

  const clearPredictions = () => {
    setPredictions([]);
  };

  const toggleWebcam = () => {
    setIsWebcamActive(!isWebcamActive);
  };

  return (
    <>
      <div className="p-4 w-full h-screen flex flex-col">
        <div className="flex space-x-2 mb-4">
          <button onClick={toggleWebcam} className="bg-blue-500 text-white py-2 px-4 rounded">
            {isWebcamActive ? 'Stop Webcam' : 'Start Webcam'}
          </button>
          <button onClick={clearPredictions} className="bg-red-500 text-white py-2 px-4 rounded">
            Clear Predictions
          </button>
        </div>
        <div className="relative w-full h-full">
          {isWebcamActive && <video ref={videoRef} className="w-full h-full absolute" autoPlay muted></video>}
          <canvas ref={canvasRef} className="w-full h-full absolute"></canvas>
        </div>
        <table className="top-0 right-0 bg-white p-4 rounded shadow-md">
          <thead>
            <tr>
              <th className="px-2 py-1">User</th>
              <th className="px-2 py-1">Expression</th>
              <th className="px-2 py-1">Time</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((prediction, index) => (
              <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'} hover:bg-gray-200`}>
                <td className="px-2 py-1">{prediction.user}</td>
                <td className="px-2 py-1">{prediction.expression}</td>
                <td className="px-2 py-1">{prediction.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
    </>
  );
}

export default App;
