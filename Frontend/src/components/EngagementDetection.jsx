import React, { useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import Webcam from 'react-webcam';

const EngagementDetection = ({ setPredictions }) => {
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
    if (videoRef.current) {
      videoRef.current.video.play();
      startFaceDetection();
    }
  };

  const startFaceDetection = async () => {
    if (!canvasRef.current || !videoRef.current) return;

    const video = videoRef.current.video;
    const canvas = canvasRef.current;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    const intervalId = setInterval(async () => {
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
    tempContext.drawImage(videoRef.current.video, x, y, width, height, 0, 0, width, height);

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

  return (
    <div className="relative flex-grow">
      <Webcam ref={videoRef} className="w-full h-full absolute" />
      <canvas ref={canvasRef} className="w-full h-full absolute"></canvas>
    </div>
  );
};

export default EngagementDetection;
