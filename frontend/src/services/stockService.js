/**
 * Stock Service — Stock de Semences API Calls
 * =============================================
 */
import client from '../api/client';

export const stockService = {
  getAll:                () => client.get('/stock'),
  getById:               (id) => client.get(`/stock/${id}`),
  getStats:              () => client.get('/stock/stats'),
  getHealth:             () => client.get('/stock/health'),  getSicamStats: () => client.get('/stock/sicam'),
  getStockYield: () => client.get('/stock/yield'),
  create:                (data) => client.post('/stock', data),
  delete:                (id) => client.delete(`/stock/${id}`),
  createMovement:        (stockId, data) => client.post(`/stock/${stockId}/mouvements`, data),
  getAllMovements:       () => client.get('/stock/mouvements'),
  createBatch:           (data) => client.post('/stock/batch', data),

  // ── Germination ──
  setManualRate:         (stockId, tauxManuel) => client.put(`/stock/${stockId}/taux-manuel`, { tauxManuel }),
  createGerminationTest: (stockId, data) => client.post(`/stock/${stockId}/tests`, data),
  getGerminationTests:   (stockId) => client.get(`/stock/${stockId}/tests`),
  getAllGerminationTests: () => client.get('/stock/tests/all'),
  deleteGerminationTest: (testId) => client.delete(`/stock/tests/${testId}`),
};

export default stockService;
