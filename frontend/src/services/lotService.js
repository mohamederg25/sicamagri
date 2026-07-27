/**
 * Lot Service — Lots API Calls
 * ==============================
 */
import client from '../api/client';

export const lotService = {
  getAll:     () => client.get('/lots'),
  getById:    (id) => client.get(`/lots/${id}`),
  create:     (data) => client.post('/lots', data),

  markReady: (id) => client.put(`/lots/${id}/mark-ready`),
  markHarvest: (id, nombrePlantsProduits) =>
    client.put(`/lots/${id}/mark-harvest`, { nombrePlantsProduits }),
  markDelivery: (id, data) => client.put(`/lots/${id}/mark-delivery`, data),
  addNote: (id, data) => client.put(`/lots/${id}/add-note`, data),
  getHistory: () => client.get('/lots/history'),
};

export default lotService;
