// components/SessionFormModal.tsx
import React, { useState } from 'react';
import { Modal, Box, TextField, Button } from '@mui/material';
import axios from 'axios';
import { Prediction } from '@/types/prediction';

interface SessionFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  data: Prediction[];
}

const SessionFormModal: React.FC<SessionFormModalProps> = ({ open, onClose, onSave, data }) => {
  const [sessionDetails, setSessionDetails] = useState({ sessionName: '', sessionDate: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSessionDetails({ ...sessionDetails, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      // Combine session details and predictions
      const payload = {
        ...sessionDetails,
        predictions: data
      };

      const response = await axios.post('http://localhost:8080/save-predictions', payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      onSave(response.data);
      onClose();
    } catch (error) {
      console.error('Error saving session details:', error);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{ padding: 2, backgroundColor: 'white', margin: 'auto', maxWidth: 400 }}>
        <h2>Detail Sesi</h2>
        <TextField
          label="Mata Kuliah"
          name="sessionName"
          fullWidth
          value={sessionDetails.sessionName}
          onChange={handleChange}
        />
        <TextField
          label="Tanggal"
          name="sessionDate"
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={sessionDetails.sessionDate}
          onChange={handleChange}
        />
        <Button variant="contained" color="primary" onClick={handleSubmit}>
          Save
        </Button>
      </Box>
    </Modal>
  );
};

export default SessionFormModal;
