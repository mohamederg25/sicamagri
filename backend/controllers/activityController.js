/**
 * Activity Controller
 * ====================
 * Provides the aggregated activity timeline for the Historique page.
 */

const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const activityService = require('../services/activityService');

/** GET /api/activity — get all activity events (sorted by date descending) */
exports.getActivity = asyncHandler(async (req, res) => {
  const events = await activityService.getAllActivity(req.user);
  sendSuccess(res, events, 'Activité récupérée');
});
