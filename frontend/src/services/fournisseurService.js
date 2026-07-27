/**
 * Fournisseur Service — Supplier API Calls
 * =========================================
 */
import client from '../api/client';

export const fournisseurService = {
  getAll:       () => client.get('/fournisseurs'),
  getActive:    () => client.get('/fournisseurs/actif'),
  create:       (data) => client.post('/fournisseurs', data),
  update:       (id, data) => client.put(`/fournisseurs/${id}`, data),
  delete:       (id) => client.delete(`/fournisseurs/${id}`),
};

export default fournisseurService;
