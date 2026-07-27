/**
 * User Service — User Management API Calls
 * =========================================
 */
import client from '../api/client';

export const userService = {
  getAll:            () => client.get('/users'),
  getIngenieurs:     () => client.get('/users/ingenieurs'),
  getById:           (id) => client.get(`/users/${id}`),
  create:            (data) => client.post('/users', data),
  update:            (id, data) => client.put(`/users/${id}`, data),
  delete:            (id) => client.delete(`/users/${id}`),
  updatePassword:    (id, data) => client.put(`/users/${id}/password`, data),
  updateRole:        (id, data) => client.put(`/users/${id}/role`, data),
};

export default userService;
