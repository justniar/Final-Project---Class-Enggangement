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
  const [isWebcamActive, setIsWebcamActive] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

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
    setupCamera();
  };

  const setupCamera = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: 'user',
        width: window.innerWidth > window.innerHeight ? { ideal: window.innerWidth } : undefined,
        height: window.innerWidth <= window.innerHeight ? { ideal: window.innerHeight } : undefined
      }
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then((mediaStream) => {
        setStream(mediaStream);
        video.srcObject = mediaStream;
        video.onloadeddata = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          video.play();
          detectVideo(video, canvas);
        };
      })
      .catch((err) => console.error(`Camera Error: ${(err as Error).message || err}`));
  };

  const detectVideo = async (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    if (!video || video.paused) return;

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

      const yoloResults = await predictWithYOLO(video);
      const fps = 1000 / (performance.now() - t0);
      drawFaces(canvas, faceApiResults, yoloResults, fps.toLocaleString());

      const newPredictions: Prediction[] = yoloResults.map((result: any) => ({
        userId: result.userId,
        expression: result.expression,
        time: new Date().toLocaleTimeString(),
        gender: faceApiResults[0]?.gender || 'unknown',
        focus: result.expression // Assuming focus is mapped to expression
      }));

      setPredictions(newPredictions);
      
      requestAnimationFrame(() => detectVideo(video, canvas));
    } catch (err) {
      console.error(`Detect Error: ${JSON.stringify(err)}`);
    }
  };

  const predictWithYOLO = async (video: HTMLVideoElement) => {
    try {
      const canvasSnapshot = document.createElement('canvas');
      const ctx = canvasSnapshot.getContext('2d');
      if (!ctx) return [];
      canvasSnapshot.width = video.videoWidth;
      canvasSnapshot.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

      const formData = new FormData();
      formData.append('frame', dataURLtoBlob(canvasSnapshot.toDataURL()), 'snapshot.png');

      const response = await axios.post('http://localhost:5000/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const predictions = response.data;
      for (const prediction of predictions) {
        const userFormData = new FormData();
        userFormData.append('frame', dataURLtoBlob(canvasSnapshot.toDataURL()), 'snapshot.png');

        const userResponse = await axios.post('http://localhost:5000/identify-user', userFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        prediction.userId = userResponse.data.user_id;
        prediction.confidence = userResponse.data.confidence;
      }

      return predictions;
    } catch (error) {
      console.error('Error predicting:', error);
      return [];
    }
  };

  const drawFaces = (canvas: HTMLCanvasElement, faceApiResults: FaceApiResult[], customModelResults: any[], fps: string) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'small-caps 10px "Segoe UI"';
    ctx.fillStyle = 'white';
    ctx.fillText(`FPS: ${fps}`, 10, 25);
  
    for (const person of faceApiResults) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'deepskyblue';
      ctx.fillStyle = 'deepskyblue';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.rect(person.detection.box.x, person.detection.box.y, person.detection.box.width, person.detection.box.height);
      ctx.stroke();
      ctx.globalAlpha = 1;
  
      const expression = Object.entries(person.expressions).sort((a, b) => b[1] - a[1]);
      ctx.fillStyle = 'lightblue';
      ctx.fillText(`gender: ${Math.round(100 * person.genderProbability)}% ${person.gender}`, person.detection.box.x, person.detection.box.y - 30);
      ctx.fillText(`keadaan emosional: ${Math.round(100 * expression[0][1])}% ${expression[0][0]}`, person.detection.box.x, person.detection.box.y - 20);
  
      const prediction = customModelResults.find((result: any) => isOverlapping(person.detection.box, result.box));
      const cognitiveCondition = prediction ? prediction.expression : 'unknown';
      const userId = prediction ? prediction.userId : 'unknown';
      const confidence = prediction ? prediction.confidence : 'unknown';
  
      ctx.fillText(`kondisi kognitif: ${cognitiveCondition}`, person.detection.box.x, person.detection.box.y - 10);
      ctx.fillText(`User: ${userId} Confidence: ${confidence}`, person.detection.box.x, person.detection.box.y);
    }
  };  

  const isOverlapping = (box1: faceapi.Box, box2: number[]) => {
    const [x1, y1, w1, h1] = [box1.x, box1.y, box1.width, box1.height];
    const [x2, y2, w2, h2] = box2;
    return !(x2 + w2 < x1 || x2 > x1 + w1 || y2 + h2 < y1 || y2 > y1 + h1);
  };

  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleToggleWebcam = () => {
    setIsWebcamActive((prevIsActive) => !prevIsActive);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    } else {
      setupCamera();
    }
  };

  return (
    <PageContainer title="Detection" description="this is Detection page">
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={12}>
            <Button variant="contained" color="primary" onClick={handleToggleWebcam}>
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