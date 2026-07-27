/**
 * ProductionRule Service — Cycles de Semis API Calls
 * ===================================================
 */
import client from '../api/client';

export const productionRuleService = {
  getAll:     () => client.get('/cycles-de-semis'),
  getActive:  () => client.get('/cycles-de-semis', { params: { isActive: true } }),
  getById:    (id) => client.get(`/cycles-de-semis/${id}`),
  create:     (data) => client.post('/cycles-de-semis', data),
  update:     (id, data) => client.put(`/cycles-de-semis/${id}`, data),
  delete:     (id) => client.delete(`/cycles-de-semis/${id}`),
};

export default productionRuleService;
