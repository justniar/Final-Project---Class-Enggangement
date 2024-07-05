'use client';
import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Button, Box, Grid, TextField } from '@mui/material';
import PageContainer from '@/components/container/PageContainer';

const modelPath = '/models/';

interface DetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const CaptureDataset: React.FC = () => {
  const [label, setLabel] = useState<string>('');
  const [dataset, setDataset] = useState<faceapi.LabeledFaceDescriptors[]>([]);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(true);
  const [stream, setStream] = useState<MediaStream | null>(null);

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
    if (!videoRef.current || !canvasRef.current || !label) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const detections = await faceapi.detectSingleFace(canvas).withFaceLandmarks().withFaceDescriptor();
    
    if (!detections) {
      console.error('No face detected');
      return;
    }

    const newLabeledFaceDescriptors = new faceapi.LabeledFaceDescriptors(label, [detections.descriptor]);
    setDataset((prevDataset) => [...prevDataset, newLabeledFaceDescriptors]);
    console.log('Face captured and labeled:', label);
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
              disabled={!label || isCapturing}
              style={{ marginTop: '10px' }}
            >
              Capture Image
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
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default CaptureDataset;
