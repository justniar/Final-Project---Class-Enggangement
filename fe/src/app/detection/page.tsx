'use client';
import { TextEncoder, TextDecoder } from 'text-encoding';
import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Grid, Box, Button } from '@mui/material';
import PageContainer from '@/components/container/PageContainer';
import StudentEnggagement from '@/components/monitoring/StudentEnggagement';
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

interface Prediction {
  user: string;
  expression: string;
  time: string;
}

interface FaceApiResult {
  detection: faceapi.FaceDetection;
  expressions: { [key: string]: number };
  age: number;
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadModels = () => {
      faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath)
        .then(() => faceapi.nets.ageGenderNet.loadFromUri(modelPath))
        .then(() => faceapi.nets.faceLandmark68Net.loadFromUri(modelPath))
        .then(() => faceapi.nets.faceRecognitionNet.loadFromUri(modelPath))
        .then(() => faceapi.nets.faceExpressionNet.loadFromUri(modelPath))
        .then(() => {
          console.log('Face API models loaded');
          optionsSSDMobileNet = new faceapi.SsdMobilenetv1Options({ minConfidence: minScore, maxResults });
          setupCamera();
        })
        .catch(err => console.error('Model loading error:', err));
    };

    loadModels();
  }, []);

  const setupCamera = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    if (!navigator.mediaDevices) {
      console.error('Camera Error: access not supported');
      return;
    }

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: 'user',
        width: window.innerWidth > window.innerHeight ? { ideal: window.innerWidth } : undefined,
        height: window.innerWidth <= window.innerHeight ? { ideal: window.innerHeight } : undefined
      }
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        setStream(stream);
        video.srcObject = stream;
      })
      .catch(err => console.error(`Camera Error: ${(err as Error).message || err}`));

    video.onloadeddata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.play();
      detectVideo(video, canvas);
    };
  };

  const detectVideo = (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    if (!video || video.paused) return;

    const t0 = performance.now();
    faceapi.detectAllFaces(video, optionsSSDMobileNet)
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender()
      .then(result => {
        const faceApiResults: FaceApiResult[] = result.map(res => ({
          detection: res.detection,
          expressions: res.expressions as unknown as { [key: string]: number },
          age: res.age,
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
        return result;
      })
      .then(() => requestAnimationFrame(() => detectVideo(video, canvas)))
      .catch(err => console.error(`Detect Error: ${JSON.stringify(err)}`));
  };

  const drawFaces = (canvas: HTMLCanvasElement, data: FaceApiResult[], fps: string) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'small-caps 20px "Segoe UI"';
    ctx.fillStyle = 'white';
    ctx.fillText(`FPS: ${fps}`, 10, 25);

    data.forEach(person => {
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
      ctx.fillText(`umur: ${Math.round(person.age)} years`, person.detection.box.x, person.detection.box.y);

      predict(person.detection.box, canvas)
        .then(predictResult => {
          ctx.fillText(`Fokus: ${predictResult.expression}`, person.detection.box.x, person.detection.box.y - 5);
          console.log(predictResult);
          console.log(predictResult.expression);
        })
        .catch(error => {
          console.error('Error predicting:', error);
        });
    });
  };

  const predict = (box: faceapi.Box, canvas: HTMLCanvasElement) => {
    const formData = new FormData();
    return axios.post('http://localhost:5000/predict', formData)
      .then(response => {
        if (response.status !== 200) {
          throw new Error('Predict API failed');
        }
        return { expression: response.data.expression_predicted_class_label };
      })
      .catch(error => {
        console.error('Error predicting:', error);
        return { expression: 'unknown' };
      });
  };

  const handleToggleWebcam = () => {
    setIsWebcamActive(prevIsActive => !prevIsActive);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
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
                '& video': {
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                },
                '& canvas': {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                },
              }}
            >
              <video ref={videoRef} />
              <canvas ref={canvasRef} />
            </Box>
          </Grid>
        </Grid>
        <StudentEnggagement />
      </Box>
    </PageContainer>
  );
};

export default Detection;
