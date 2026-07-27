/**
 * Activity Service — Activity Log API Calls
 * ===========================================
 */
import client from '../api/client';

export const activityService = {
  getAll: () => client.get('/activity'),
};

export default activityService;
