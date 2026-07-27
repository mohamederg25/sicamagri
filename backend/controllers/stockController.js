/**
 * Stock Controller — Seed Warehouse Stock Request Handlers
 * ==========================================================
 *
 * Handles HTTP requests for stock de semences operations.
 * All routes are protected (require authentication) and
 * restricted to admin and employe roles.
 */

const StockSemence = require('../models/StockSemence');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendMessage, AppError } = require('../utils/response');
const stockService = require('../services/stockService');
const activityLogger = require('../services/activityLogger');

/** GET /api/stock — list all stock entries */
exports.getAll = asyncHandler(async (req, res) => {
  const stock = await stockService.getAll(req.user, req.query);
  sendSuccess(res, stock, 'Liste des stocks de semences');
});

/** GET /api/stock/stats — stock statistics dashboard */
exports.getStats = asyncHandler(async (req, res) => {
  const stats = await stockService.getStats();
  sendSuccess(res, stats, 'Statistiques du stock');
});

/** GET /api/stock/:id — get a single stock entry with movements */
exports.getById = asyncHandler(async (req, res) => {
  const stock = await stockService.getById(req.params.id);
  sendSuccess(res, stock, 'Détail du stock');
});

/** POST /api/stock — create a new stock entry */
exports.create = asyncHandler(async (req, res) => {
  const stock = await stockService.create(req.body, req.user._id);
  sendCreated(res, stock, 'Stock de semences créé avec succès');
});

/** DELETE /api/stock/:id — delete a stock entry */
exports.remove = asyncHandler(async (req, res) => {
  const stock = await stockService.remove(req.params.id);

  activityLogger.log({
    action: 'delete', entityType: 'stock',
    entityId: stock._id, entityCode: stock.code,
    details: `Stock ${stock.code} supprimé (${stock.quantiteInitiale} graines initiales)`,
    userId: req.user._id,
  });

  sendMessage(res, 'Stock supprimé');
});

/** POST /api/stock/:id/mouvements — create a stock movement */
exports.createMovement = asyncHandler(async (req, res) => {
  const data = {
    ...req.body,
    stockSemence: req.params.id,
  };
  const mouvement = await stockService.createMovement(data, req.user._id);
  sendCreated(res, mouvement, 'Mouvement créé avec succès');
});

/** GET /api/stock/mouvements — get all movements (global history) */
exports.getAllMovements = asyncHandler(async (req, res) => {
  const mouvements = await stockService.getAllMovements(req.user, req.query);
  sendSuccess(res, mouvements, 'Historique des mouvements');
});

/** PUT /api/stock/:id/taux-manuel — set manual germination rate */
exports.setManualRate = asyncHandler(async (req, res) => {
  const stock = await stockService.setManualRate(req.params.id, req.body.tauxManuel);

  activityLogger.log({
    action: 'update', entityType: 'stock',
    entityId: stock._id, entityCode: stock.code,
    details: `Taux de germination manuel ${req.body.tauxManuel != null ? 'défini à ' + req.body.tauxManuel + '%' : 'effacé'} sur ${stock.code}`,
    userId: req.user._id,
  });

  sendSuccess(res, stock, 'Taux de germination mis à jour');
});

/** POST /api/stock/:id/tests — create a germination test on stock */
exports.createGerminationTest = asyncHandler(async (req, res) => {
  const test = await stockService.createGerminationTest(req.params.id, req.body, req.user._id);
  sendCreated(res, test, 'Taux de germination mis à jour');
});

/** GET /api/stock/:id/tests — get all germination tests for a stock */
exports.getGerminationTests = asyncHandler(async (req, res) => {
  const tests = await stockService.getGerminationTests(req.params.id);
  sendSuccess(res, tests, 'Tests de germination');
});

/** GET /api/stock/tests/all — get ALL germination tests (global view) */
exports.getAllGerminationTests = asyncHandler(async (req, res) => {
  const tests = await stockService.getAllGerminationTests();
  sendSuccess(res, tests, 'Tous les tests de germination');
});

/** DELETE /api/stock/tests/:testId — delete a germination test */
exports.deleteGerminationTest = asyncHandler(async (req, res) => {
  const test = await stockService.deleteGerminationTest(req.params.testId);

  activityLogger.log({
    action: 'delete', entityType: 'stock',
    entityId: test.stockSemence,
    details: `Test de germination supprimé (${test.grainesTestees} testées, ${test.grainesGermees} germées)`,
    userId: req.user._id,
  });

  sendMessage(res, 'Test supprimé');
});

/** GET /api/stock/health — stock health alerts */
exports.getStockHealth = asyncHandler(async (req, res) => {
  const health = await stockService.getStockHealth();
  sendSuccess(res, health, 'État de santé du stock');
});

/** POST /api/stock/batch — create multiple stock entries at once */
exports.createBatch = asyncHandler(async (req, res) => {
  const entries = req.body.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new AppError('Aucune entrée à créer', 400);
  }
  const created = await stockService.createBatch(entries, req.user._id);
  sendCreated(res, created, `${created.length} entrée(s) de stock créée(s)`);
});

/** GET /api/stock/sicam — SICAM production statistics */
exports.getSicamStats = asyncHandler(async (req, res) => {
  const stats = await stockService.getSicamStats();
  sendSuccess(res, stats, 'Statistiques SICAM');
});

/** GET /api/stock/yield — stock-level yield/performance data */
exports.getStockYield = asyncHandler(async (req, res) => {
  const data = await stockService.getStockYield();
  sendSuccess(res, data, 'Rendement du stock');
});
