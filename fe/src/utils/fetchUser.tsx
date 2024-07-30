// utils/fetchUser.ts
import axios from 'axios';

export const fetchUser = async () => {
  const token = localStorage.getItem('authToken'); // Retrieve token from storage

  if (!token) {
    throw new Error('No authentication token found');
  }

  try {
    const response = await axios.get('http://localhost:8080/users', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data; // Assumes the API returns user data in response.data
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    throw error;
  }
};
