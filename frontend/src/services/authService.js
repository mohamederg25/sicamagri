/**
 * Auth Service — Authentication API Calls
 * =========================================
 */
import client from '../api/client';

export const authService = {
  getMe:      () => client.get('/auth/me'),
  login:      (email, password) => client.post('/auth/login', { email, password }),
  register:   (data) => client.post('/auth/register', data),
  logout:     () => client.post('/auth/logout'),
  updateProfile: (data) => client.put('/auth/update-profile', data),
  changePassword: (data) => client.put('/auth/change-password', data),
};

export default authService;
