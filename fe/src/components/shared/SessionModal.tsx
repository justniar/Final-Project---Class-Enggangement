import React, { useState, useEffect } from 'react';
import { Modal, Box, TextField, Button, MenuItem, Select, InputLabel, FormControl, SelectChangeEvent } from '@mui/material';
import axios from 'axios';
import { Prediction } from '@/types/prediction';

interface SessionFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  data: Prediction[];
}

const SessionFormModal: React.FC<SessionFormModalProps> = ({ open, onClose, onSave, data }) => {
  const [sessionDetails, setSessionDetails] = useState({
    dosenId: '2',
    mataKuliahId: '2',
    sessionDate: '2024-07-27'
  });

  // Load initial form data or handle any data transformations if needed
  useEffect(() => {
    // Example to set default values or transformations
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target as HTMLInputElement | HTMLSelectElement;
    setSessionDetails({
      ...sessionDetails,
      [name]: value
    });
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setSessionDetails({
      ...sessionDetails,
      [name]: value
    });
  };

  const handleSubmit = async () => {
    try {
      // Build the payload
      const payload = {
        dosen_id: parseInt(sessionDetails.dosenId, 10),
        mataKuliah_id: parseInt(sessionDetails.mataKuliahId, 10),
        session_date: new Date(sessionDetails.sessionDate).toISOString(), // This will be in ISO 8601 format
        MonitoringRecord: (data || []).map((prediction) => ({
          monitoring_records_id: prediction.id,
          nim: prediction.userId,
          ekspresi: prediction.expression,
          gender: prediction.gender,
          ketertarikan: prediction.focus,
          waktu_tercatat: new Date(prediction.time).toISOString(),
        }))
      };

      // Post data to API
      const response = await axios.post('http://localhost:8080/save-predictions', payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      // Handle success
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
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="dosen-select-label">Dosen</InputLabel>
          <Select
            labelId="dosen-select-label"
            name="dosenId"
            value={sessionDetails.dosenId}
            onChange={handleSelectChange} // Use handleSelectChange for Select elements
          >
            {/* Add options dynamically or statically */}
            <MenuItem value="1">Dosen 1</MenuItem>
            <MenuItem value="2">Dosen Pemograman Bergerak</MenuItem>
            {/* Add more options as needed */}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="mata-kuliah-select-label">Mata Kuliah</InputLabel>
          <Select
            labelId="mata-kuliah-select-label"
            name="mataKuliahId"
            value={sessionDetails.mataKuliahId}
            onChange={handleSelectChange} // Use handleSelectChange for Select elements
          >
            {/* Add options dynamically or statically */}
            <MenuItem value="1">Mata Kuliah 1</MenuItem>
            <MenuItem value="2">Pemograman Bergerak</MenuItem>
            {/* Add more options as needed */}
          </Select>
        </FormControl>

        <TextField
          label="Tanggal"
          name="sessionDate"
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={sessionDetails.sessionDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e)}
          sx={{ mb: 2 }}
        />

        <Button variant="contained" color="primary" onClick={handleSubmit}>
          Save
        </Button>
      </Box>
    </Modal>
  );
};

export default SessionFormModal;
