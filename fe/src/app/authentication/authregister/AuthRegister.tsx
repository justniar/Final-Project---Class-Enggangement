// AuthRegister.tsx
"use client"
import React, { useState, ChangeEvent, MouseEvent } from 'react';
import { Box, Typography, Button, Grid, TextField } from '@mui/material';
import axios from 'axios';
import SuccessModal from '@/components/shared/successmodal'; // Import the modal component

interface AuthRegisterProps {
    title?: string;
    subtitle?: JSX.Element | JSX.Element[];
    subtext?: JSX.Element | JSX.Element[];
}

const AuthRegister: React.FC<AuthRegisterProps> = ({ title, subtitle, subtext }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: '',
        phone: '',
    });
    const [modalOpen, setModalOpen] = useState(false);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [id]: value,
        }));
    };

    const handleSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:8080/register', formData);
            console.log(response.data);
            setModalOpen(true); // Open the modal on successful registration
        } catch (error) {
            console.error('Registration failed:', error);
            // Handle registration error (e.g., show an error message)
        }
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        window.location.href = '/authentication/login'; // Redirect to login page
    };

    return (
        <>
            {title ? (
                <Typography fontWeight="700" variant="h2" mb={1}>
                    {title}
                </Typography>
            ) : null}

            {subtext}

            <Box>
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="name" mb="5px">Name</Typography>
                        <TextField id="name" variant="outlined" fullWidth value={formData.name} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="email" mb="5px">Email Address</Typography>
                        <TextField id="email" variant="outlined" fullWidth value={formData.email} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="password" mb="5px">Password</Typography>
                        <TextField id="password" variant="outlined" fullWidth value={formData.password} onChange={handleChange}  type="password"  />
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="role" mb="5px">Role</Typography>
                        <TextField id="role" variant="outlined" fullWidth value={formData.role} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="phone" mb="5px">Phone</Typography>
                        <TextField id="phone" variant="outlined" fullWidth value={formData.phone} onChange={handleChange} />
                    </Grid>
                </Grid>
                <Button color="primary" variant="contained" size="large" fullWidth onClick={handleSubmit}>
                    Sign Up
                </Button>
            </Box>
            {subtitle}

            {/* Render the modal */}
            <SuccessModal open={modalOpen} onClose={handleCloseModal} />
        </>
    );
};

export default AuthRegister;
