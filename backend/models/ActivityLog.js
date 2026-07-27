/**
 * ActivityLog Model
 * =================
 * Logs every significant action across the system for the Historique page.
 * Supplements the query-based events (Semis, Lot, StockMouvement) with
 * explicit log entries for updates, deletions, and admin CRUD operations.
 */

const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    /** Action type: 'create', 'update', 'delete', 'assign', 'remove_assign', etc. */
    action: { type: String, required: true },

    /** Entity type: 'semis', 'stock', 'pepiniere', 'variete', 'fournisseur', 'user', 'production_rule' */
    entityType: { type: String, required: true },

    /** Reference to the affected entity (optional for some actions) */
    entityId: { type: mongoose.Schema.Types.ObjectId },

    /** Human-readable code / name of the entity */
    entityCode: { type: String },

    /** Human-readable description of what happened */
    details: { type: String },

    /** Extra metadata (stored as JSON) */
    metadata: { type: mongoose.Schema.Types.Mixed },

    /** Who performed the action */
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
