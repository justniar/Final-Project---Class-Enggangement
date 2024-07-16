import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import axios from 'axios';

const modelPath = '/models/'; 
const minScore = 0.2;
const maxResults = 5;
let optionsSSDMobileNet;

const App = () => {
  const [predictedUser, setPredictedUser] = useState(null);
  const [predictedExpression, setPredictedExpression] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [isWebcamActive, setIsWebcamActive] = useState(true);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lastPredictionRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
      await faceapi.nets.ageGenderNet.loadFromUri(modelPath);
      await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
      await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
      await faceapi.nets.faceExpressionNet.loadFromUri(modelPath);
      optionsSSDMobileNet = new faceapi.SsdMobilenetv1Options({ minConfidence: minScore, maxResults });
      setupCamera();
    };

    loadModels();
  }, []);

  const setupCamera = async () => {
    
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    if (!navigator.mediaDevices) {
      console.error('Camera Error: access not supported');
      return null;
    }

    let stream;
    const constraints = { audio: false, video: { facingMode: 'user', resizeMode: 'crop-and-scale' } };
    if (window.innerWidth > window.innerHeight) constraints.video.width = { ideal: window.innerWidth };
    else constraints.video.height = { ideal: window.innerHeight };

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.error(`Camera Error: ${err.message || err}`);
      return null;
    }

    if (stream) {
      video.srcObject = stream;
    } else {
      console.error('Camera Error: stream empty');
      return null;
    }

    video.onloadeddata = async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.play();
      detectVideo(video, canvas);
    };
  };

  const detectVideo = async (video, canvas) => {
    if (!video || video.paused) return false;

    const t0 = performance.now();
    faceapi
      .detectAllFaces(video, optionsSSDMobileNet)
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender()
      .then((result) => {
        const fps = 1000 / (performance.now() - t0);
        drawFaces(canvas, result, fps.toLocaleString());
        requestAnimationFrame(() => detectVideo(video, canvas));
        return true;
      })
      .catch((err) => {
        console.error(`Detect Error: ${JSON.stringify(err)}`);
        return false;
      });

    return false;
  };

  const drawFaces = (canvas, data, fps) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'small-caps 20px "Segoe UI"';
    ctx.fillStyle = 'white';
    ctx.fillText(`FPS: ${fps}`, 10, 25);

    for (const person of data) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'deepskyblue';
      ctx.fillStyle = 'deepskyblue';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.rect(person.detection.box.x, person.detection.box.y, person.detection.box.width, person.detection.box.height);
      ctx.stroke();
      ctx.globalAlpha = 1;

      const expression = Object.entries(person.expressions).sort((a, b) => b[1] - a[1]);
      ctx.fillStyle = 'black';
      ctx.fillText(`gender: ${Math.round(100 * person.genderProbability)}% ${person.gender}`, person.detection.box.x, person.detection.box.y - 59);
      ctx.fillText(`expression: ${Math.round(100 * expression[0][1])}% ${expression[0][0]}`, person.detection.box.x, person.detection.box.y - 41);
      ctx.fillText(`age: ${Math.round(person.age)} years`, person.detection.box.x, person.detection.box.y - 23);
      ctx.fillText(`roll:${person.angle.roll}° pitch:${person.angle.pitch}° yaw:${person.angle.yaw}°`, person.detection.box.x, person.detection.box.y - 5);
      ctx.fillStyle = 'lightblue';
      ctx.fillText(`gender: ${Math.round(100 * person.genderProbability)}% ${person.gender}`, person.detection.box.x, person.detection.box.y - 60);
      ctx.fillText(`expression: ${Math.round(100 * expression[0][1])}% ${expression[0][0]}`, person.detection.box.x, person.detection.box.y - 42);
      ctx.fillText(`age: ${Math.round(person.age)} years`, person.detection.box.x, person.detection.box.y - 24);
      ctx.fillText(`roll:${person.angle.roll}° pitch:${person.angle.pitch}° yaw:${person.angle.yaw}°`, person.detection.box.x, person.detection.box.y - 6);

      ctx.globalAlpha = 0.8;
      ctx.fillStyle = 'lightblue';
      const pointSize = 2;
      for (let i = 0; i < person.landmarks.positions.length; i++) {
        ctx.beginPath();
        ctx.arc(person.landmarks.positions[i].x, person.landmarks.positions[i].y, pointSize, 0, 2 * Math.PI);
        ctx.fill();
      }

      predictOnFrame(person.detection.box, canvas);
    }
  };

  const predictOnFrame = async (detectionBox, canvas) => {
    const { x, y, width, height } = detectionBox;
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
        <table className="top-0 right-0 bg-white p-2 m-4 w-full">
          <thead>
            <tr className='w-full'>
              <th>User</th>
              <th>Expression</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody className='w-full'>
            {predictions.map((prediction, index) => (
              <tr key={index}>
                <td>{prediction.user}</td>
                <td>{prediction.expression}</td>
                <td>{prediction.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default App;
