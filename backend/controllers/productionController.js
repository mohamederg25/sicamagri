/**
 * Production Controller — Production Record Endpoints
 * =====================================================
 */

const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, AppError } = require('../utils/response');
const productionService = require('../services/productionService');

/** GET /api/production — get all production records */
exports.getRecords = asyncHandler(async (req, res) => {
  const records = await productionService.getAllRecords();
  sendSuccess(res, records, 'Liste des enregistrements de production');
});
