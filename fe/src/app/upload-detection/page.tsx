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

const UploadDetection: React.FC = () => {
  const [isWebcamActive, setIsWebcamActive] = useState(false);
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
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
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

      const fps = 1000 / (performance.now() - t0);
      drawFaces(canvas, faceApiResults, fps.toLocaleString());
      requestAnimationFrame(() => detectVideo(video, canvas));
    } catch (err) {
      console.error(`Detect Error: ${JSON.stringify(err)}`);
    }
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
      ctx.fillStyle = 'lightblue';
      ctx.fillText(`gender: ${Math.round(100 * person.genderProbability)}% ${person.gender}`, person.detection.box.x, person.detection.box.y - 20);
      ctx.fillText(`ekspresi: ${Math.round(100 * expression[0][1])}% ${expression[0][0]}`, person.detection.box.x, person.detection.box.y - 10);

      const predictResult = predict(person.detection.box, canvas);
      ctx.fillText(`Fokus: ${predictResult.expression}`, person.detection.box.x, person.detection.box.y);
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

      // const identifyUser = predictUser(person.detection.box, canvas);
      // ctx.fillText(`User: ${identifyUser.user_id} Confidence: ${identifyUser.confidence}`, person.detection.box.x, person.detection.box.y + person.detection.box.height + 10);
      // console.log(identifyUser);
      // console.log(identifyUser.user_id);
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
        return { expression: response.expression_predicted_class_label };
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
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={12}>
            <Button variant="contained" color="primary" component="label">
              Upload Video
              <input type="file" accept="video/*" hidden onChange={handleFileChange} />
            </Button>
            <Box
              sx={{
                width: '100%',
                margin: '0 auto',
                height: '100%',
                maxWidth: '800px',
                position: 'relative',
              }}
            >
              <video ref={videoRef} width="100%" height="auto" controls />
              <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
            </Box>
          </Grid>
        </Grid>
      </Box>
      <StudentEnggagement studentMonitoring={predictions} />
      <Button variant="contained" onClick={handleBulkInsert}>
            Simpan hasil deteksi
      </Button>
    </PageContainer>
  );
};

export default UploadDetection;
