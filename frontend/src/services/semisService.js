/**
 * Semis Service — Semis API Calls
 * ================================
 */
import client from '../api/client';

export const semisService = {
  getAll:       () => client.get('/semis'),
  getAllIndividual: () => client.get('/semis/all'),
  getById:      (id) => client.get(`/semis/${id}`),
  create:       (data) => client.post('/semis', data),
  update:       (id, data) => client.put(`/semis/${id}`, data),
  delete:       (id) => client.delete(`/semis/${id}`),
  transfer:     (id, data) => client.post(`/semis/${id}/transfer`, data),
  getTestedPairs: () => client.get('/semis/tested-pairs'),
  getSupervision: () => client.get('/semis/supervision'),
  getExternalStats: () => client.get('/semis/external-stats'),
};

export default semisService;
