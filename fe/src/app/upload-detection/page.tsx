'use client';
import { TextEncoder, TextDecoder } from 'text-encoding';
import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Grid, Button } from '@mui/material';
import PageContainer from '@/components/container/PageContainer';
import StudentEnggagement from '@/components/monitoring/StudentEnggagement';
import { Prediction } from '@/types/prediction';
import axios from 'axios';
import { Box } from 'face-api.js';

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

const UploadDetection: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
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
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setVideoFile(file);
    if (file) {
      const video = videoRef.current;
      if (video) {
        video.src = URL.createObjectURL(file);
        video.onloadeddata = () => {
          const canvas = canvasRef.current;
          if (canvas) {
            // const { videoWidth, videoHeight } = video;
            // console.log(`Video dimensions: ${videoWidth}x${videoHeight}`);
            canvas.width = video.videoWidth || 0;
            canvas.height = video.videoHeight || 0;
            video.play();
            detectVideo(video, canvas);
          }
        };
      }
    }
  };

  const detectVideo = async (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    if (!video || video.paused || video.ended) return;

    const t0 = performance.now();
    try {
      const yoloResults = await predictWithYOLO(video, canvas);
      const faceApiResults = await detectFacesInYOLOResults(video, canvas, yoloResults);

      const fps = 1000 / (performance.now() - t0);
      drawFaces(canvas, faceApiResults, fps.toLocaleString());
      requestAnimationFrame(() => detectVideo(video, canvas));
    } catch (err) {
      console.error(`Detect Error: ${JSON.stringify(err)}`);
    }
  };

  const predictWithYOLO = async (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
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

    return response.data;
  };

  const detectFacesInYOLOResults = async (video: HTMLVideoElement, canvas: HTMLCanvasElement, yoloResults: any[]) => {
    const faceApiResults: FaceApiResult[] = [];

    for (const result of yoloResults){
      const croppedCanvas = cropCanvas(canvas, result.box);
      const detections = await faceapi.detectAllFaces(croppedCanvas, optionsSSDMobileNet).withFaceLandmarks().withFaceExpressions().withAgeAndGender();

      for (const detection of detections) {
        faceApiResults.push({
          detection: detection.detection,
          expressions: detection.expressions as unknown as { [key: string]: number },
          gender: detection.gender,
          genderProbability: detection.genderProbability,
          landmarks: detection.landmarks,
          angle: {
            roll: detection.angle.roll ?? 0,
            pitch: detection.angle.pitch ?? 0,
            yaw: detection.angle.yaw ?? 0,
          }
        });
      }
    }

    return faceApiResults;
  };

  const drawFaces = (canvas: HTMLCanvasElement, data: FaceApiResult[], fps: string) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'small-caps 10px "Segoe UI"';
    ctx.fillStyle = 'white';
    ctx.fillText(`FPS: ${fps}`, 10, 25);

    for (const person of data) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'deepskyblue';
      ctx.fillStyle = 'deepskyblue';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.rect(person.detection.box.x, person.detection.box.y, person.detection.box.width, person.detection.box.height);
      ctx.stroke();
      ctx.globalAlpha = 1;

      const expression = Object.entries(person.expressions).sort((a, b) => b[1] - a[1]);
      ctx.fillStyle = 'red'; // Ubah warna dari lightblue ke merah (red)
      ctx.fillText(`gender: ${Math.round(100 * person.genderProbability)}% ${person.gender}`, person.detection.box.x, person.detection.box.y - 20);
      ctx.fillText(`ekspresi: ${Math.round(100 * expression[0][1])}% ${expression[0][0]}`, person.detection.box.x, person.detection.box.y - 10);

      const predictResult = predict(person.detection.box, canvas);
      ctx.fillText(`Ketertarikan: ${predictResult.expression}`, person.detection.box.x, person.detection.box.y);
      console.log(predictResult);
      console.log(predictResult.expression);

      const newPrediction: Prediction = {
        id: predictions.length + 1,
        name: 'Unknown', // Replace with actual user identification logic if available
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
    
    if (!ctx) {
      throw new Error('Unable to create 2D context');
    }
  
    croppedCanvas.width = box.width;
    croppedCanvas.height = box.height;
    ctx.drawImage(canvas, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
    
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
        console.log('API Response:', response); // Log the entire response for debugging
        // Assuming you want the class label of the first prediction
        const expression = response.length > 0 ? response[0].class : 'unknown';
        return { expression };
      } else {
        throw new Error('Predict API failed');
      }
    } catch (error) {
      console.error('Error predicting:', error);
      return { expression: 'unknown' };
    }
  };

  // const predictUser = (box: faceapi.Box, canvas: HTMLCanvasElement) => {
  //   try {
  //     const formData = new FormData();
  //     const croppedCanvas = cropCanvas(canvas, box);
  //     const blob = dataURLtoBlob(croppedCanvas.toDataURL());
  //     formData.append('frame', blob, 'snapshot.png');

  //     const xhr = new XMLHttpRequest();
  //     xhr.open('POST', 'http://localhost:5000/identify-user', false);
  //     xhr.send(formData);

  //     if (xhr.status === 200) {
  //       const response = JSON.parse(xhr.responseText);
  //       return { user_id: response.user_id, confidence: response.confidence };
  //     } else {
  //       throw new Error('Predict API failed');
  //     }
  //   } catch (error) {
  //     console.error('Error predicting:', error);
  //     return { user_id: 'unknown' };
  //   }
  // };

  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
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