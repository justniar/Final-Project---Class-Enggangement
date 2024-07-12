'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Grid, Box, Button } from '@mui/material';
import PageContainer from '@/components/container/PageContainer';
import StudentEnggagement from '@/components/monitoring/StudentEnggagement';

const TextEncodingPolyfill = require('text-encoding');

global.TextEncoder = TextEncodingPolyfill.TextEncoder;
global.TextDecoder = TextEncodingPolyfill.TextDecoder;

const modelPath = '/models/';
const minScore = 0.2;
const maxResults = 5;

interface DetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Prediction {
  user: string;
  expression: string;
  time: string;
}

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
  userId: string;
}

let optionsSSDMobileNet: faceapi.SsdMobilenetv1Options;
let faceMatcher: faceapi.FaceMatcher;

const Recognize: React.FC = () => {
  const [isWebcamActive, setIsWebcamActive] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [labeledDescriptors, setLabeledDescriptors] = useState<faceapi.LabeledFaceDescriptors[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
      await faceapi.nets.ageGenderNet.loadFromUri(modelPath);
      await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
      await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
      await faceapi.nets.faceExpressionNet.loadFromUri(modelPath);

      console.log('Face API models loaded');
      optionsSSDMobileNet = new faceapi.SsdMobilenetv1Options({ minConfidence: minScore, maxResults });

      const descriptors = await loadLabeledDescriptors();
      setLabeledDescriptors(descriptors);
      setupCamera();
    } catch (error) {
      console.error('Model loading error:', error);
    }
  };

  const loadLabeledDescriptors = async () => {
    const labels = ['Black Widow', 'Captain America', 'Hawkeye', 'Jim Rhodes', 'Tony Stark', 'Thor', 'Captain Marvel']; // Replace with your user IDs
    const labeledDescriptors = await Promise.all(
      labels.map(async (label) => {
        const descriptions: Float32Array[] = [];
        for (let i = 1; i <= 3; i++) { // Assume 3 images per user
          const img = await faceapi.fetchImage(`/labeled_images/${label}/${i}.jpg`);
          const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
          if (detections) {
            descriptions.push(detections.descriptor);
          }
        }
        return new faceapi.LabeledFaceDescriptors(label, descriptions);
      })
    );
    return labeledDescriptors;
  };

  const setupCamera = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    if (!navigator.mediaDevices) {
      console.error('Camera Error: access not supported');
      return null;
    }

    let stream;
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: 'user',
        width: window.innerWidth > window.innerHeight ? { ideal: window.innerWidth } : undefined,
        height: window.innerWidth <= window.innerHeight ? { ideal: window.innerHeight } : undefined,
      },
    };

    navigator.mediaDevices.getUserMedia(constraints).then((mediaStream) => {
      stream = mediaStream;
      if (stream) {
        setStream(stream);
        video.srcObject = stream;
      } else {
        console.error('Camera Error: stream empty');
        return null;
      }

      video.onloadeddata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.play();
        detectVideo(video, canvas);
      };
    }).catch((err) => {
      console.error(`Camera Error: ${(err as Error).message || err}`);
      return null;
    });
  };

  const detectVideo = async (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    if (!video || video.paused) return;

    const t0 = performance.now();
    try {
      const result = await faceapi
        .detectAllFaces(video, optionsSSDMobileNet)
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions()
        .withAgeAndGender();

      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
      const faceApiResults = result.map((res) => {
        const bestMatch = faceMatcher.findBestMatch(res.descriptor);
        return {
          detection: res.detection,
          expressions: res.expressions as unknown as { [key: string]: number },
          gender: res.gender,
          genderProbability: res.genderProbability,
          landmarks: res.landmarks,
          angle: {
            roll: res.angle.roll ?? 0,
            pitch: res.angle.pitch ?? 0,
            yaw: res.angle.yaw ?? 0,
          },
          userId: bestMatch.toString()
        };
      });

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
    ctx.font = 'small-caps 20px "Segoe UI"';
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
      ctx.fillText(`gender: ${Math.round(100 * person.genderProbability)}% ${person.gender}`, person.detection.box.x, person.detection.box.y - 40);
      ctx.fillText(`ekspresi: ${Math.round(100 * expression[0][1])}% ${expression[0][0]}`, person.detection.box.x, person.detection.box.y - 20);
      ctx.fillText(`User ID: ${person.userId}`, person.detection.box.x, person.detection.box.y + person.detection.box.height + 20);

      // Call Predict API
      const predictResult = predict(person.detection.box, canvas);
      ctx.fillText(`Fokus: ${predictResult.expression}`, person.detection.box.x, person.detection.box.y);
      console.log(predictResult);
      console.log(predictResult.expression);
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
      xhr.open('POST', 'http://localhost:5000/predict', false); // false for synchronous request
      xhr.send(formData);

      if (xhr.status === 200) {
        return JSON.parse(xhr.responseText) as Prediction;
      } else {
        throw new Error(`Request failed with status ${xhr.status}`);
      }
    } catch (error) {
      console.error('Prediction error:', error);
      return { user: 'unknown', expression: 'unknown', time: '' };
    }
  };

  const dataURLtoBlob = (dataURL: string): Blob => {
    const parts = dataURL.split(',');
    const byteString = atob(parts[1]);
    const mimeString = parts[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  const handleWebcamToggle = () => {
    setIsWebcamActive(!isWebcamActive);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    } else {
      setupCamera();
    }
  };

  return (
    <PageContainer title="Monitoring Engagement">
      <Grid container spacing={0} justifyContent="center" sx={{ height: '100vh' }}>
        <Grid item xs={12} sm={6} lg={8}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            sx={{ height: '100%', width: '100%' }}
          >
            {isWebcamActive ? (
              <video ref={videoRef} width="100%" height="100%" autoPlay muted />
            ) : (
              <canvas ref={canvasRef} width="100%" height="100%" />
            )}
          </Box>
          <Button variant="contained" color="primary" onClick={handleWebcamToggle}>
            {isWebcamActive ? 'Stop Webcam' : 'Start Webcam'}
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <StudentEnggagement />
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Recognize;
