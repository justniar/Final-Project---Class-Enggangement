import React, { useState } from 'react';
import EngagementDetection from './components/EngagementDetection';
import ReportTable from './components/ReportTable';

function App() {
  const [isWebcamActive, setIsWebcamActive] = useState(true);
  const [predictions, setPredictions] = useState([]);

  const clearPredictions = () => {
    setPredictions([]);
  };

  const toggleWebcam = () => {
    setIsWebcamActive(!isWebcamActive);
  };

  return (
    <div className="p-4 min-h-screen flex flex-col items-center">
      <div className="flex space-x-2 mb-4">
        <button onClick={toggleWebcam} className="bg-blue-500 text-white py-2 px-4 rounded">
          {isWebcamActive ? 'Stop Webcam' : 'Start Webcam'}
        </button>
        <button onClick={clearPredictions} className="bg-red-500 text-white py-2 px-4 rounded">
          Clear Predictions
        </button>
      </div>
      {isWebcamActive && <EngagementDetection setPredictions={setPredictions} />}
      <ReportTable predictions={predictions} />
    </div>
  );
}

export default App;
