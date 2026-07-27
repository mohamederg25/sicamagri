/**
 * Pepiniere Service — Nursery API Calls
 * ======================================
 */
import client from '../api/client';

export const pepiniereService = {
  getAll:       () => client.get('/pepinieres'),
  getActive:    () => client.get('/pepinieres/active'),
  create:       (data) => client.post('/pepinieres', data),
  update:       (id, data) => client.put(`/pepinieres/${id}`, data),
  delete:       (id) => client.delete(`/pepinieres/${id}`),
  assignUser:   (pepId, userId) => client.post(`/pepinieres/${pepId}/assign/${userId}`),
  removeUser:   (pepId, userId) => client.delete(`/pepinieres/${pepId}/assign/${userId}`),
};

export default pepiniereService;
