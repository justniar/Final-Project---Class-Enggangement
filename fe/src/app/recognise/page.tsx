'use client';
import { TextEncoder, TextDecoder } from 'text-encoding';
import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Grid, Box, Button } from '@mui/material';
import PageContainer from '@/components/container/PageContainer';
import StudentEnggagement from '@/components/monitoring/StudentEnggagement';

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
  userId: string;  // Added userId here
}

let optionsSSDMobileNet: faceapi.SsdMobilenetv1Options;
let faceMatcher: faceapi.FaceMatcher;

const Recognize: React.FC = () => {
  const [isWebcamActive, setIsWebcamActive] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [labeledDescriptors, setLabeledDescriptors] = useState<faceapi.LabeledFaceDescriptors[]>([]);  // State to store labeled descriptors

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
      faceapi.nets.ageGenderNet.loadFromUri(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
      faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
    ]);
    console.log('Face API models loaded');
    optionsSSDMobileNet = new faceapi.SsdMobilenetv1Options({ minConfidence: minScore, maxResults });
    const descriptors = await loadLabeledDescriptors();
    setLabeledDescriptors(descriptors);
    setupCamera();
  };

  const loadLabeledDescriptors = async () => {
    const labels = ['Black Widow', 'Captain America', 'Hawkeye' , 'Jim Rhodes', 'Tony Stark', 'Thor', 'Captain Marvel']; // Replace with your user IDs
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

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: 'user',
        width: window.innerWidth > window.innerHeight ? { ideal: window.innerWidth } : undefined,
        height: window.innerWidth <= window.innerHeight ? { ideal: window.innerHeight } : undefined,
      },
    };

    navigator.mediaDevices.getUserMedia(constraints).then((mediaStream) => {
      setStream(mediaStream);
      video.srcObject = mediaStream;
      video.onloadeddata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.play();
        detectVideo(video, canvas);
      };
    }).catch((err) => {
      console.error(`Camera Error: ${(err as Error).message || err}`);
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
    }
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
          <Grid item xs={12} lg={12}>
            <StudentEnggagement />
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Recognize;
