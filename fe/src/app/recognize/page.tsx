'use client';
import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Button, Box, Grid, TextField, Typography, Card, CardContent, CardMedia } from '@mui/material';
import PageContainer from '@/components/container/PageContainer';
import axios from 'axios';

const modelPath = '/models/';

interface CapturedImage {
  src: string;
  label: string;
}

const CaptureDataset: React.FC = () => {
  const [label, setLabel] = useState<string>('');
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captureCount, setCaptureCount] = useState<number>(0);
  const [userId, setUserId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
      await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
      await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
      console.log('Face API models loaded');
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
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: 'user',
        width: window.innerWidth > window.innerHeight ? { ideal: window.innerWidth } : undefined,
        height: window.innerWidth <= window.innerHeight ? { ideal: window.innerHeight } : undefined
      }
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.error(`Camera Error: ${(err as Error).message || err}`);
      return null;
    }

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
    };
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current || !label || isCapturing) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const capturedImageSrc = canvas.toDataURL('image/png');
    const newCapturedImage: CapturedImage = { src: capturedImageSrc, label };
    setCapturedImages((prevImages) => [...prevImages, newCapturedImage]);

    setCaptureCount((prevCount) => prevCount + 1);
    console.log('Face captured and labeled:', label);

    try {
      const response = await axios.post('http://localhost:5000/capture', { userId, image: capturedImageSrc });
      console.log(response.data.message);
    } catch (error) {
        console.error('Error capturing image:', error);
    }

    if (captureCount === 9) {
      stopCapturing();
    }
  };

  const startCapturingAutomatically = () => {
    setIsCapturing(true);
    captureAutomatically();
  };

  const captureAutomatically = () => {
    const delay = 2000; // Adjust delay time in milliseconds
    const interval = setInterval(() => {
      captureImage();
      if (captureCount === 9) {
        clearInterval(interval);
        stopCapturing();
      }
    }, delay);
  };

  const toggleWebcam = () => {
    if (isWebcamActive) {
      stopWebcam();
    } else {
      setupCamera();
    }
    setIsWebcamActive(!isWebcamActive);
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const stopCapturing = () => {
    setIsCapturing(false);
    stopWebcam();
  };

  return (
    <PageContainer title="Capture Dataset" description="Capture images for dataset">
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={12}>
            <TextField 
              label="Label" 
              variant="outlined" 
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              fullWidth
            />
            <Button 
              variant="contained" 
              color="primary" 
              onClick={captureImage}
              disabled={!label || isCapturing || captureCount === 10}
              style={{ marginTop: '10px' }}
            >
              Capture Image {captureCount + 1}/10
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={startCapturingAutomatically}
              disabled={!label || isCapturing || captureCount === 10}
              style={{ marginTop: '10px', marginLeft: '10px' }}
            >
              Capture Automatically
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={toggleWebcam}
              style={{ marginTop: '10px', marginLeft: '10px' }}
            >
              {isWebcamActive ? 'Turn Off Webcam' : 'Turn On Webcam'}
            </Button>
            <Box
              sx={{
                position: 'relative',
                overflow: 'hidden',
                marginTop: '20px',
                '& video': {
                  position: 'absolute',
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
          <Grid item xs={12} lg={12}>
            <Typography variant="h6" style={{ marginTop: '20px' }}>Captured Images:</Typography>
            <Grid container spacing={3}>
              {capturedImages.map((image, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card>
                    <CardMedia
                      component="img"
                      height="140"
                      image={image.src}
                      alt={`Captured face ${index + 1}`}
                    />
                    <CardContent>
                      <Typography variant="body2" color="textSecondary" component="p">
                        Label: {image.label}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default CaptureDataset;
