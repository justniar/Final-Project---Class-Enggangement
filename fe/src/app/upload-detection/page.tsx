'use client';
import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Grid, Button, Box } from '@mui/material';
import PageContainer from '@/components/container/PageContainer';
import StudentEnggagement from '@/components/monitoring/StudentEnggagement';
import { Prediction } from '@/types/prediction';
import axios from 'axios';

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

  const drawFaces = (canvas: HTMLCanvasElement, faceData: FaceApiResult[], yoloData: any[], fps: string) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'small-caps 12px "Segoe UI"';
    ctx.fillStyle = 'white';
    ctx.fillText(`FPS: ${fps}`, 10, 25);

    faceData.forEach((person) => {
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
      ctx.fillText(`Gender: ${Math.round(100 * person.genderProbability)}% ${person.gender}`, person.detection.box.x, person.detection.box.y - 15);
      ctx.fillText(`Perasaan: ${expression[0][0]}`, person.detection.box.x, person.detection.box.y - 30);

      yoloData.forEach((prediction: any) => {
        if (prediction.class === 'person' && person.detection.box.x < prediction.box.x && person.detection.box.y < prediction.box.y) {
          ctx.fillStyle = 'lightblue';
          ctx.fillText(`User ID: ${prediction.userId}`, person.detection.box.x, person.detection.box.y + person.detection.box.height +10);
        }
      });
    });
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
    <Button variant="contained" onClick={handleBulkInsert}>
      Simpan hasil deteksi
    </Button>
  </PageContainer>
  );
};

export default UploadDetection;
