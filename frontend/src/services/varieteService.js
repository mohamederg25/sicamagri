/**
 * Variete Service — Variety API Calls
 * ====================================
 */
import client from '../api/client';

export const varieteService = {
  getAll:       () => client.get('/varietes'),
  getActive:    () => client.get('/varietes/active'),
  create:       (data) => client.post('/varietes', data),
  update:       (id, data) => client.put(`/varietes/${id}`, data),
  delete:       (id) => client.delete(`/varietes/${id}`),
};

export default varieteService;
