// app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../api/login/userServices';
import { User } from '@/types/users';
import {
  Container,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Box,
  IconButton,
  Typography,
} from '@mui/material';
import { Delete} from '@mui/icons-material';
import { IconEyeEdit } from '@tabler/icons-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ManageUser = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<Partial<User> | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
      toast.done('Fetch users')
    } catch (error) {
      toast.error('Failed to fetch users');
    }
  };

  const handleOpen = (user: Partial<User> | null) => {
    setSelectedUser(user);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedUser(null);
  };

  const handleSave = async () => {
    if (selectedUser) {
      console.log('Saving user:', selectedUser);
      if (selectedUser.id) {
        await updateUser(selectedUser.id, selectedUser);
        toast.success('User updated successfully');
      } else {
        await createUser(selectedUser);
        toast.success('User created successfully');
      }
      handleClose();
      fetchUsers();
    }
  };
  

  const handleDeleteUser = async (id: number) => {
    try {
      await deleteUser(id);
      console.log('User deleted successfully');
      toast.error('User deleted successfully');
      fetchUsers(); // Refresh the user list after deletion
    } catch (error) {
        toast.error('Failed to delete user');
        console.error('Failed to delete user', error);
    }
  };

  const roleColors = {
    admin: '#EBF4F6', // Light red for admin
    dosen: '#ccffcc', // Light green for dosen
  };

  return (
    <Typography component="div" sx={{ fontFamily: 'Arial, sans-serif', fontSize: 12, fontWeight: 'bold' }}>
        <Container>
        <Button variant="contained" color="primary" onClick={() => handleOpen({})}>
            Add User
        </Button>
        <Table>
            <TableHead>
            <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Actions</TableCell>
            </TableRow>
            </TableHead>
            <TableBody>
            {users.map((user) => (
                <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone}</TableCell>
                <TableCell>
                    <Box
                    sx={{
                        backgroundColor: user.role === 'admin' ? roleColors.admin : roleColors.dosen,
                        borderRadius: '12px',
                        padding: '4px 12px',
                        display: 'inline-block',
                        textAlign: 'center',
                    }}
                    >
                    {user.role}
                    </Box>
                </TableCell>
                <TableCell>
                    <IconButton onClick={() => handleOpen(user)}>
                    <IconEyeEdit/>
                    </IconButton>
                    <IconButton onClick={() => handleDeleteUser(user.id)}>
                    <Delete />
                    </IconButton>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>

        <Dialog open={open} onClose={handleClose}>
            <DialogTitle>{selectedUser?.id ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogContent>
            <TextField
                margin="dense"
                label="Name"
                fullWidth
                value={selectedUser?.name || ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
            />
            <TextField
                margin="dense"
                label="Email"
                fullWidth
                value={selectedUser?.email || ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
            />
            <TextField
                margin="dense"
                label="Phone"
                fullWidth
                value={selectedUser?.phone || ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
            />
            <TextField
                margin="dense"
                label="Role"
                fullWidth
                value={selectedUser?.role || ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
            />
            </DialogContent>
            <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
            </DialogActions>
        </Dialog>

        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
        </Container>
    </Typography>
  );
};

export default ManageUser;
