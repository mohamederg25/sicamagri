/**
 * ProductionRecord Model — Completed Production Records
 * ======================================================
 *
 * Stores a simplified record of each completed production delivery.
 * Auto-created when a production lot is marked as delivered (livré).
 *
 * This is a read-only historical record for the company to track
 * all productions across pepinieres, semis, and varieties.
 *
 * Fields are denormalized (pepiniere/variete names stored directly)
 * so records remain intact even if the referenced documents change.
 */

const mongoose = require('mongoose');

const productionRecordSchema = new mongoose.Schema({
  code: { type: String, required: true },
  lotRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot', required: true },

  // Denormalized data (captured at delivery time)
  pepiniere: { type: String, required: true },
  pepiniereId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pepiniere' },
  semisCode: { type: String },
  semisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semis' },
  variete: { type: String, required: true },
  varieteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variete' },

  // Quantities
  quantitePlantee: { type: Number, default: 0 },
  quantiteProduite: { type: Number, default: 0 },
  quantiteLivree: { type: Number, default: 0 },

  // Dates
  dateEntree: { type: Date },
  dateRecolte: { type: Date },
  dateLivraison: { type: Date, required: true },

  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

productionRecordSchema.index({ dateLivraison: -1 });
productionRecordSchema.index({ pepiniereId: 1 });
productionRecordSchema.index({ varieteId: 1 });

module.exports = mongoose.model('ProductionRecord', productionRecordSchema);
