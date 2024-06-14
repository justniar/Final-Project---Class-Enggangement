import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [predictedClass, setPredictedClass] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Start the video stream when the component mounts
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => console.error("Error accessing webcam: ", err));
  }, []);

  const captureFrame = async () => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('frame', blob, 'frame.jpg');

      try {
        const response = await axios.post('http://localhost:5000/predict', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setPredictedClass(response.data.predicted_class);
      } catch (error) {
        console.error("Error predicting frame: ", error);
      }
    }, 'image/jpeg');
  };

  return (
    <>
      <div className="video-container">
        <video ref={videoRef} autoPlay playsInline></video>
        <canvas ref={canvasRef} width="640" height="480" style={{ display: 'none' }}></canvas>
        <button onClick={captureFrame}>Capture Frame</button>
        {predictedClass !== null && (
          <p>Predicted Class: {predictedClass}</p>
        )}
      </div>
    </>
  );
}

export default App;
