'use client';
import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Grid, Button } from '@mui/material';
import PageContainer from '@/components/container/PageContainer';
import StudentEnggagement from '@/components/monitoring/StudentEnggagement';
import { Prediction } from '@/types/prediction';
import axios from 'axios';
import SessionFormModal from '@/components/shared/SessionModal';

const modelPath = '/models/';
const minScore = 0.2;
const maxResults = 5;

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

const UploadDetection: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (videoFile) {
      setupVideo(videoFile);
    }
  }, [videoFile]);

  const loadModels = async () => {
    await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
    await faceapi.nets.ageGenderNet.loadFromUri(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
    await faceapi.nets.faceExpressionNet.loadFromUri(modelPath);
    console.log('Face API models loaded');
    optionsSSDMobileNet = new faceapi.SsdMobilenetv1Options({ minConfidence: minScore, maxResults });
  };

  const setupVideo = (file: File) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      video.src = URL.createObjectURL(file);
      video.onloadeddata = () => {
        canvas.width = video.videoWidth || 0;
        canvas.height = video.videoHeight || 0;
        video.play();
        detectVideo(video, canvas);
      };
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setVideoFile(file);
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
  
      const expression = Object.entries(faceApiResults[0].expressions).sort((a, b) => b[1] - a[1]);
  
      const newPrediction: Prediction = {
        id: predictions.length + 1,
        userId: customBox.userId, // From custom model
        expression: expression[0][0], // From faceapi
        gender: faceApiResults[0].gender, // From faceapi
        focus: customBox.class, // From custom model
        confidence: customBox.confidence, // From custom model
        time: new Date().toLocaleTimeString(),
      };
  
      setPredictions((prev) => [...prev, newPrediction]);
  
      // Drawing additional information
      ctx.fillStyle = 'lightblue';
      ctx.fillText(`gender: ${Math.round(100 * faceApiResults[0].genderProbability)}% ${faceApiResults[0].gender}`, faceApiBox.x, faceApiBox.y - 30);
      ctx.fillText(`keadaan emosional: ${Math.round(100 * expression[0][1])}% ${expression[0][0]}`, faceApiBox.x, faceApiBox.y - 20);
      ctx.fillText(`kondisi kognitif: ${customBox.class}`, faceApiBox.x, faceApiBox.y - 10);
      ctx.fillText(`NIM: ${customBox.userId} Confidence: ${customBox.confidence}`, faceApiBox.x, faceApiBox.y + faceApiBox.height);
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

  const handleSaveSession = (session: any) => {
    setSessionData(session); // Store session data
    setIsModalOpen(false); // Close the modal
  };
  

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  return (
    <PageContainer title="Detection" description="this is Detection page">
    <div>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={12}>
          <Button variant="contained" color="primary" component="label">
            Upload Video
            <input type="file" accept="video/*" hidden onChange={handleFileChange} />
          </Button>
          <div
            style={{
              width: '100%',
              margin: '0 auto',
              height: '100%',
              maxWidth: '800px',
              position: 'relative',
            }}
          >
            <video ref={videoRef} width="100%" height="auto" controls />
            <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
          </div>
        </Grid>
      </Grid>
      
    </div>
      <StudentEnggagement studentMonitoring={predictions} />
      
      <Button variant="contained" color="primary" onClick={() => setIsModalOpen(true)}>
         Simpan hasil deteksi
      </Button>

      {isModalOpen && (
        <SessionFormModal
          open={isModalOpen}
          onClose={handleModalClose}
          onSave={handleSaveSession}
          data={sessionData}
        />
      )}
      {sessionData}
  </PageContainer>
  );
};

export default UploadDetection;
