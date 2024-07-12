'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Box, Button, TextField } from '@mui/material';
import axios from 'axios';

// Import TextEncoder and TextDecoder polyfill
import { TextEncoder, TextDecoder } from 'text-encoding';

declare global {
  interface Window {
      TextEncoder: { new (): { encode (string: string): Uint8Array } };
      TextDecoder: { new (): { decode (bytes: Uint8Array): string } };
  }
}

// if (typeof window !== 'undefined') {
//   // Ensure global TextEncoder and TextDecoder are available in the browser context
//   if (!('TextEncoder' in window)) {
//     window.TextEncoder = TextEncoder;
//   }

//   if (!('TextDecoder' in window)) {
//     window.TextDecoder = TextDecoder;
//   }
// }

const modelPath = '/models/';
const minScore = 0.2;
const maxResults = 5;

const CaptureAndLabel: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [labeledDescriptors, setLabeledDescriptors] = useState<faceapi.LabeledFaceDescriptors[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
    setupCamera();
  };

  const setupCamera = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;

    video.onloadeddata = () => {
      video.play();
    };
  };

  const captureAndLabelFace = async () => {
    const video = videoRef.current;
    if (!video) return;

    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
    if (!detection) {
      console.error('No face detected');
      return;
    }

    const newDescriptor = new faceapi.LabeledFaceDescriptors(userId, [detection.descriptor]);
    setLabeledDescriptors([...labeledDescriptors, newDescriptor]);

    // Save to backend
    await axios.post('http://localhost:5000/save_face', {
      user_id: userId,
      descriptor: Array.from(detection.descriptor)
    });
  };

  return (
    <Box>
      <TextField
        label="User ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />
      <Button onClick={captureAndLabelFace}>Capture and Label Face</Button>
      <Box>
        <video ref={videoRef} style={{ width: '100%', height: 'auto' }} />
        {/* <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} /> */}
      </Box>
    </Box>
  );
};

export default CaptureAndLabel;
