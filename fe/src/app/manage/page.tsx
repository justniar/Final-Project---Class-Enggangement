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
} from '@mui/material';
import { Delete, Edit, EditAttributesRounded } from '@mui/icons-material';
import { IconEyeEdit } from '@tabler/icons-react';

const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<Partial<User> | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const data = await getUsers();
    setUsers(data);
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
      if (selectedUser.id) {
        await updateUser(selectedUser.id, selectedUser);
      } else {
        await createUser(selectedUser);
      }
      handleClose();
      fetchUsers();
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await deleteUser(id);
      console.log('User deleted successfully');
      fetchUsers(); // Refresh the user list after deletion
    } catch (error) {
      console.error('Failed to delete user', error);
    }
  };

  const roleColors = {
    admin: '#EBF4F6', // Light red for admin
    dosen: '#ccffcc', // Light green for dosen
  };

  return (
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
    </Container>
  );
};

export default AdminDashboard;
