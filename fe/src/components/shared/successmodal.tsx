import React from 'react';
import { Dialog, DialogContent, DialogTitle, Button, Typography } from '@mui/material';

interface SuccessModalProps {
    open: boolean;
    onClose: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ open, onClose }) => {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Registration Successful</DialogTitle>
            <DialogContent>
                <Typography variant="body1" mb={2}>
                    Your registration was successful! You can now log in to your account.
                </Typography>
                <Button variant="contained" color="primary" onClick={onClose}>
                    Go to Login
                </Button>
            </DialogContent>
        </Dialog>
    );
};

export default SuccessModal;
