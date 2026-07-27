/**
 * Stock Routes — Seed Warehouse Stock API Endpoints
 * ===================================================
 *
 * All routes require authentication.
 * Create/update/delete operations require admin or employe role.
 * Read operations are open to all authenticated users.
 *
 * Endpoints:
 *   GET    /api/stock              — List all stock entries
 *   GET    /api/stock/stats        — Stock statistics dashboard
 *   GET    /api/stock/mouvements   — All movements (global history)
 *   GET    /api/stock/:id          — Single stock entry with movements
 *   POST   /api/stock              — Create a new stock entry
 *   DELETE /api/stock/:id          — Delete a stock entry
 *   POST   /api/stock/:id/mouvements — Create a movement from this stock
 */

const express = require('express');
const router = express.Router();
const {
  getAll,
  getStats,
  getById,
  create,
  createBatch,
  remove,
  createMovement,
  getAllMovements,
  setManualRate,
  createGerminationTest,
  getGerminationTests,
  getAllGerminationTests,
  deleteGerminationTest,
  getStockHealth,
  getSicamStats,
  getStockYield,
} = require('../controllers/stockController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Read endpoints — all authenticated users can view
router.get('/', getAll);
router.get('/stats', getStats);
router.get('/health', getStockHealth);
router.get('/sicam', getSicamStats);
router.get('/mouvements', getAllMovements);
router.get('/yield', getStockYield);
router.get('/:id', getById);

// Write endpoints — admin and employe only
router.post('/', authorize('admin', 'employe'), create);
router.post('/batch', authorize('admin', 'employe'), createBatch);
router.delete('/:id', authorize('admin', 'employe'), remove);
router.post('/:id/mouvements', authorize('admin', 'employe'), createMovement);

// Germination endpoints
router.get('/tests/all', getAllGerminationTests);
router.get('/:id/tests', getGerminationTests);
router.put('/:id/taux-manuel', authorize('admin', 'employe'), setManualRate);
router.post('/:id/tests', authorize('admin', 'employe'), createGerminationTest);
router.delete('/tests/:testId', authorize('admin', 'employe'), deleteGerminationTest);

module.exports = router;
