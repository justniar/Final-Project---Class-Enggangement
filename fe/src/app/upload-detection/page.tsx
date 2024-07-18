'use client';
import { TextEncoder, TextDecoder } from 'text-encoding';
import React, { useRef, useState } from 'react';
import { Grid, Box, Button } from '@mui/material';
import PageContainer from '@/components/container/PageContainer';
import StudentEnggagement from '@/components/monitoring/StudentEnggagement';
import { Prediction } from '@/types/prediction';
import axios from 'axios';

const UploadDetection: React.FC = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
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

  const detectVideo = (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    if (!video || video.paused || video.ended) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const frame = canvas.toDataURL('image/jpeg');
    const blob = dataURLtoBlob(frame);

    const formData = new FormData();
    formData.append('frame', blob, 'frame.jpg');

    axios.post('http://localhost:5000/predict', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then(response => {
      const predictions = response.data;
      drawPredictions(predictions, ctx);
    })
    .catch(error => {
      console.error('Error predicting:', error);
    });

    requestAnimationFrame(() => detectVideo(video, canvas));
  };

  const drawPredictions = (predictions: any[], ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (const prediction of predictions) {
      const [x1, y1, x2, y2] = prediction.box;
      const width = x2 - x1;
      const height = y2 - y1;
      ctx.strokeStyle = 'deepskyblue';
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, width, height);
      ctx.fillStyle = 'lightblue';
      ctx.fillText(`Label: ${prediction.class}`, x1, y1 - 10);

      const newPrediction: Prediction = {
        id: predictions.length + 1,
        name: 'Unknown', // Replace with actual user identification logic if available
        expression: prediction.class,
        gender: 'Unknown', // Update with gender if available
        focus: prediction.class,
        time: new Date().toLocaleTimeString(),
      };
      setPredictions(prev => [...prev, newPrediction]);
    }
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

  const handleBulkInsert = () => {
    axios.post('http://localhost:5000/save-predictions', predictions, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(response => {
      if (response.status === 200) {
        console.log('Predictions saved successfully');
        setPredictions([]);
      } else {
        console.error('Failed to save predictions');
      }
    })
    .catch(error => {
      console.error('Error saving predictions:', error);
    });
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
