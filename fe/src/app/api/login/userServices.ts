// services/userService.ts
import axios from 'axios';
import { User } from '@/types/users';

const API_URL = 'http://localhost:8080';

export const getUsers = async (): Promise<User[]> => {
  const response = await axios.get(`${API_URL}/users`);
  return response.data;
};

export const createUser = async (user: Partial<User>): Promise<User> => {
  const response = await axios.post(`${API_URL}/users`, user);
  return response.data;
};

export const updateUser = async (id: number, user: Partial<User>): Promise<User> => {
  const response =  await axios.put(`${API_URL}/users/${id}`, user);
  return response.data;
};

export const deleteUser = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/users/${id}`);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};
