'use client';
import { TextEncoder, TextDecoder } from 'text-encoding';
import React, { useEffect, useRef, useState } from 'react';
import { Grid, Button } from '@mui/material';
import PageContainer from '@/components/container/PageContainer';
import StudentEnggagement from '@/components/monitoring/StudentEnggagement';
import { Prediction } from '@/types/prediction';
import axios from 'axios';

const minScore = 0.2;
const maxResults = 5;

interface DetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

let optionsSSDMobileNet: any;

const UploadDetection: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    console.log('Component mounted');
  }, []);

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
        const fps = 1000 / (performance.now() - t0);
        drawDetections(canvas, yoloResults, fps.toLocaleString());
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
  
    const predictions = response.data;
    
    // Identify user for each detected face
    for (const prediction of predictions) {
      const userFormData = new FormData();
      userFormData.append('frame', blob, 'snapshot.png');
      
      const userResponse = await axios.post('http://localhost:5000/identify-user', userFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
  
      prediction.userId = userResponse.data.user_id;
      prediction.confidence = userResponse.data.confidence;
    }
  
    return predictions;
  };
  

  const drawDetections = (canvas: HTMLCanvasElement, data: any[], fps: string) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'small-caps 10px "Segoe UI"';
    ctx.fillStyle = 'white';
    ctx.fillText(`FPS: ${fps}`, 10, 25);

    console.log('Drawing detections:', data); 
    data.forEach((result: any) => {
        const [x1, y1, x2, y2] = result.box;
        const width = x2 - x1;
        const height = y2 - y1;
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'deepskyblue';
        ctx.fillStyle = 'deepskyblue';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.rect(x1, y1, width, height);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.fillStyle = 'deepskyblue';
        ctx.fillText(`Class: ${result.class}`, x1, y1 - 20);
        ctx.fillText(`Confidence: ${Math.round(result.confidence * 100)}%`, x1, y1 - 10);
        ctx.fillText(`user id: ${result.userId}`, x1, y1);

        const newPrediction: Prediction = {
            id: predictions.length + 1,
            user_id: result.userId, 
            expression: result.confidence,
            gender: 'unknown', // YOLO does not predict gender, replace with actual logic if available
            focus: result.class,
            time: new Date().toLocaleTimeString(),
        };
        setPredictions((prev) => [...prev, newPrediction]);
    });
  };


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
