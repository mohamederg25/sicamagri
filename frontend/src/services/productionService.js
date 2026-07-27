/**
 * Production Service — Production Record API Calls
 * ==================================================
 */
import client from '../api/client';

export const productionService = {
  getAll: () => client.get('/production'),
};

export default productionService;
