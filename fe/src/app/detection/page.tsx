'use client';
import { TextEncoder, TextDecoder } from 'text-encoding';
import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Grid, Box, Button } from '@mui/material';
import PageContainer from '@/components/container/PageContainer';
import StudentEnggagement from '@/components/monitoring/StudentEnggagement';
import { Prediction } from '@/types/prediction';
import axios from 'axios';

const modelPath = '/models/';
const minScore = 0.2;
const maxResults = 5;

interface DetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// interface Prediction {
//   user: string;
//   expression: string;
//   time: string;
// }

interface FaceApiResult {
  detection: faceapi.FaceDetection;
  expressions: { [key: string]: number };
  // age: number;
  gender: string;
  genderProbability: number;
  landmarks: faceapi.FaceLandmarks68;
  angle: {
    roll: number;
    pitch: number;
    yaw: number;
  };
}

let optionsSSDMobileNet: faceapi.SsdMobilenetv1Options;

const Detection: React.FC = () => {
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
    await faceapi.nets.ageGenderNet.loadFromUri(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
    await faceapi.nets.faceExpressionNet.loadFromUri(modelPath);
    console.log('Face API models loaded');
    optionsSSDMobileNet = new faceapi.SsdMobilenetv1Options({ minConfidence: minScore, maxResults });
  };

  const setupCamera = async () => {
    const video = videoRef.current;
    if (video) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 }
        });
        video.srcObject = stream;
        video.play();
        detectVideo(video, canvasRef.current!); // Start face detection
      } catch (error) {
        console.error('Error accessing webcam:', error);
      }
    }
  };  

  const detectVideo = async (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    if (!video || video.paused || video.ended) return;

    const t0 = performance.now();
    try {
      const result = await faceapi
        .detectAllFaces(video, optionsSSDMobileNet)
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender();

      const faceApiResults: FaceApiResult[] = result.map((res) => ({
        detection: res.detection,
        expressions: res.expressions as unknown as { [key: string]: number },
        gender: res.gender,
        genderProbability: res.genderProbability,
        landmarks: res.landmarks,
        angle: {
          roll: res.angle.roll ?? 0,
          pitch: res.angle.pitch ?? 0,
          yaw: res.angle.yaw ?? 0,
        }
      }));
      console.log("faceapi:", result)

      const yoloResults = await predictWithYOLO(video);
      const fps = 1000 / (performance.now() - t0);
      drawFaces(canvas, faceApiResults, yoloResults, fps.toLocaleString());
      requestAnimationFrame(() => detectVideo(video, canvas));
    } catch (err) {
      console.error(`Detect Error: ${JSON.stringify(err)}`);
    }
  };

  const predictWithYOLO = async (video: HTMLVideoElement) => {
    const formData = new FormData();
    const canvasSnapshot = document.createElement('canvas');
    const ctx = canvasSnapshot.getContext('2d');
    if (!ctx) return [];
    canvasSnapshot.width = video.videoWidth;
    canvasSnapshot.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    const blob = dataURLtoBlob(canvasSnapshot.toDataURL());
    formData.append('frame', blob, 'snapshot.png');

    const response = await axios.post('http://localhost:5000/predict', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const predictions = response.data;

    // Identify user for each detected face
    // Identifikasi user untuk tiap muka yang terdeteksi
    for (const prediction of predictions) {
      const userFormData = new FormData();
      userFormData.append('frame', blob, 'snapshot.png');

      const userResponse = await axios.post('http://localhost:5000/identify-user', userFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      prediction.userId = userResponse.data.user_id;
      prediction.confidence = userResponse.data.confidence;
    }
    console.log(predictions)
    return predictions;
  };
  const matchBoundingBoxes = (faceApiBoxes: faceapi.Box[], customModelBoxes: any[]) => {
    const matchedBoxes: any[] = [];
  
    for (const faceApiBox of faceApiBoxes) {
      for (const customBox of customModelBoxes) {
        const overlap = isOverlapping(faceApiBox, customBox.box);
        if (overlap) {
          matchedBoxes.push({
            faceApiBox,
            customBox
          });
        }
      }
    }
  
    return matchedBoxes;
  };
  
  const isOverlapping = (box1: faceapi.Box, box2: number[]) => {
    const [x1, y1, w1, h1] = [box1.x, box1.y, box1.width, box1.height];
    const [x2, y2, w2, h2] = box2;
  
    // Check if there is any overlap
    return !(x2 + w2 < x1 || x2 > x1 + w1 || y2 + h2 < y1 || y2 > y1 + h1);
  };
  

  const drawFaces = (canvas: HTMLCanvasElement, faceApiResults: FaceApiResult[], customModelResults: any[], fps: string) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'small-caps 10px "Segoe UI"';
    ctx.fillStyle = 'white';
    ctx.fillText(`FPS: ${fps}`, 10, 25);
  
    // Match bounding boxes
    const matchedBoxes = matchBoundingBoxes(
      faceApiResults.map((result) => result.detection.box),
      customModelResults
    );
  
    for (const match of matchedBoxes) {
      const { faceApiBox, customBox } = match;
  
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'deepskyblue';
      ctx.fillStyle = 'deepskyblue';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.rect(faceApiBox.x, faceApiBox.y, faceApiBox.width, faceApiBox.height);
      ctx.stroke();
      ctx.globalAlpha = 1;

      const expression = Object.entries(person.expressions).sort((a, b) => b[1] - a[1]);
      ctx.fillStyle = 'lightblue';
      ctx.fillText(`gender: ${Math.round(100 * person.genderProbability)}% ${person.gender}`, person.detection.box.x, person.detection.box.y - 40);
      ctx.fillText(`perasaan: ${Math.round(100 * expression[0][1])}% ${expression[0][0]}`, person.detection.box.x, person.detection.box.y - 20);

      const predictResult = predict(person.detection.box, canvas);
      ctx.fillText(`ketertarikan: ${predictResult.expression}`, person.detection.box.x, person.detection.box.y);
      console.log(predictResult);

      const identifyUser = predictUser(person.detection.box, canvas);
      ctx.fillText(`NIM: ${identifyUser.user_id} Confidence: ${identifyUser.confidence}`, person.detection.box.x, person.detection.box.y + person.detection.box.height + 20);
      console.log(identifyUser);

      const newPrediction: Prediction = {
        id: predictions.length + 1,
        userId: 'Unknown', // Replace with actual user identification logic if available
        expression: expression[0][0],
        gender: person.gender,
        focus: predictResult.expression,
        time: new Date().toLocaleTimeString(),
      };
  
      setPredictions((prev) => [...prev, newPrediction]);
    }
  };

  const cropCanvas = (canvas: HTMLCanvasElement, box: faceapi.Box) => {
    const croppedCanvas = document.createElement('canvas');
    const ctx = croppedCanvas.getContext('2d');
    croppedCanvas.width = box.width;
    croppedCanvas.height = box.height;
    ctx?.drawImage(canvas, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
    return croppedCanvas;
  };

  const predict = (box: faceapi.Box, canvas: HTMLCanvasElement) => {
    try {
      const formData = new FormData();
      const croppedCanvas = cropCanvas(canvas, box);
      const blob = dataURLtoBlob(croppedCanvas.toDataURL());
      formData.append('frame', blob, 'snapshot.png');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'http://localhost:5000/predict', false);
      xhr.send(formData);

      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        return { expression: response[0].class };  // Adjust according to the new response structure
      } else {
        throw new Error('Predict API failed');
      }
    } catch (error) {
      console.error('Error predicting:', error);
      return { expression: 'unknown' };
    }
  };

  const predictUser = (box: faceapi.Box, canvas: HTMLCanvasElement) => {
    try {
      const formData = new FormData();
      const croppedCanvas = cropCanvas(canvas, box);
      const blob = dataURLtoBlob(croppedCanvas.toDataURL());
      formData.append('frame', blob, 'snapshot.png');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'http://localhost:5000/identify-user', false);
      xhr.send(formData);

      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        return { user_id: response.user_id, confidence: response.confidence };
      } else {
        throw new Error('Identify User API failed');
      }
    } catch (error) {
      console.error('Error identifying user:', error);
      return { user_id: '200511152', confidence: 0 };
    }
  };

  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
  };

  const handleBulkInsert = async () => {
    try {
      const response = await axios.post('http://localhost:5000/save-predictions', predictions, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        console.log('Predictions saved successfully');
        setPredictions([]);
      } else {
        console.error('Failed to save predictions');
      }
    } catch (error) {
      console.error('Error saving predictions:', error);
    }
  };

  const handleSwitch = () => {
    if (isWebcamActive) {
      stream?.getTracks().forEach((track) => track.stop());
    } else {
      setupCamera();
    }
    setIsWebcamActive(!isWebcamActive);
  };


  return (
    <PageContainer title="Detection" description="this is Detection page">
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={12}>
            <Button variant="contained" color="primary" onClick={handleSwitch}>
              {isWebcamActive ? 'Turn Off Webcam' : 'Turn On Webcam'}
            </Button>
            <Box
              sx={{
                position: 'relative',
                overflow: 'hidden',
                marginTop: '20px',
                borderRadius: '10px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              }}
            >
              <video ref={videoRef} style={{ width: '100%', height: 'auto' }} />
              <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
            </Box>
          </Grid>
        </Grid>
      </Box>
      <StudentEnggagement studentMonitoring={predictions}/>
    </PageContainer>
  );
};

export default Detection;
