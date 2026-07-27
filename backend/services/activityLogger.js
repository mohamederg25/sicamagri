/**
 * Activity Logger
 * ===============
 * Lightweight utility to write entries into the ActivityLog collection.
 * Every controller mutation that isn't already tracked via Semis/Lot/StockMouvement
 * should call log() here.
 */

const ActivityLog = require('../models/ActivityLog');

/**
 * Log an action to the activity timeline.
 *
 * @param {Object} params
 * @param {string}  params.action      - 'create' | 'update' | 'delete' | 'assign' | 'remove_assign'
 * @param {string}  params.entityType  - 'semis' | 'stock' | 'pepiniere' | 'variete' | 'fournisseur' | 'user' | 'production_rule'
 * @param {ObjectId} [params.entityId]
 * @param {string}  [params.entityCode]
 * @param {string}  [params.details]
 * @param {Object}  [params.metadata]
 * @param {ObjectId} params.userId
 * @returns {Promise<Object>} the saved ActivityLog document
 */
const log = async ({ action, entityType, entityId, entityCode, details, metadata, userId }) => {
  try {
    return await ActivityLog.create({
      action,
      entityType,
      entityId: entityId || undefined,
      entityCode: entityCode || '',
      details: details || '',
      metadata: metadata || {},
      user: userId,
    });
  } catch (err) {
    // Non-critical — never break the main flow for a logging failure
    console.error('[ActivityLogger] Failed to log action:', err.message);
    return null;
  }
};

module.exports = { log };
