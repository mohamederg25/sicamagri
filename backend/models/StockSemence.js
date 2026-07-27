/**
 * StockSemence Model — Central Seed Warehouse Inventory (SICAM)
 * ==============================================================
 *
 * Represents seed stock received at the SICAM warehouse.
 * From this stock, seeds are distributed to:
 *   1. Nurseries (Pépinières) — creates a Semis record
 *   2. "Bon de passage" — simple exit document without nursery
 *
 * Germination rates can be tracked directly on the stock:
 *   - tauxManuel: manual germination rate (0-100)
 *   - Formal germination tests can be created via StockGerminationTest
 *
 * Stock formula:
 *   QUANTITE INITIALE = quantiteInitiale (at reception)
 *   QUANTITE RESTANTE = quantiteInitiale - SUM(mouvements.quantite)
 *   TAUX UTILISATION  = (1 - quantiteRestante / quantiteInitiale) × 100
 *
 * Code format: YYMMDDAB (e.g., 260714SE) — a numeric suffix may be appended for uniqueness
 */

const mongoose = require('mongoose');

const stockSemenceSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  variete: { type: mongoose.Schema.Types.ObjectId, ref: 'Variete', required: true },
  quantiteInitiale: { type: Number, required: true, min: 1 },
  quantiteRestante: { type: Number, required: true, min: 0 },
  fournisseur: { type: mongoose.Schema.Types.ObjectId, ref: 'Fournisseur', default: null },
  dateReception: { type: Date, default: Date.now },
  observations: { type: String, default: '' },
  // ── Germination Rate ──
  tauxManuel: { type: Number, min: 0, max: 100, default: null },
  statut: {
    type: String,
    enum: ['disponible', 'en_usage', 'epuise'],
    default: 'disponible',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Virtual: mouvements — All movements from this stock entry.
 * Populated on-the-fly when .populate('mouvements') is called.
 */
stockSemenceSchema.virtual('mouvements', {
  ref: 'StockMouvement',
  localField: '_id',
  foreignField: 'stockSemence',
  justOne: false,
});

/**
 * Virtual: tauxUtilisation — Percentage of stock used.
 */
stockSemenceSchema.virtual('tauxUtilisation').get(function () {
  if (this.quantiteInitiale === 0) return 0;
  return Math.round(((this.quantiteInitiale - this.quantiteRestante) / this.quantiteInitiale) * 100);
});

/**
 * Virtual: quantiteUtilisee — Quantity already consumed.
 */
stockSemenceSchema.virtual('quantiteUtilisee').get(function () {
  return (this.quantiteInitiale || 0) - (this.quantiteRestante || 0);
});

/**
 * Virtual: germinationTests — Formal germination tests on this stock.
 * Populated on-the-fly when .populate('germinationTests') is called.
 */
stockSemenceSchema.virtual('germinationTests', {
  ref: 'StockGerminationTest',
  localField: '_id',
  foreignField: 'stockSemence',
  justOne: false,
});

/**
 * Virtual: tauxGermination — Best available germination rate.
 * Priority: latest formal test > manual rate > null
 */
stockSemenceSchema.virtual('tauxGermination').get(function () {
  // This is a simplified virtual — for real calculation with test data,
  // the service layer handles it with populated tests.
  return this.tauxManuel;
});


// ── Dynamic Status ──────────────────────────────────────────────────
// Automatically computes statut from quantiteInitiale / quantiteRestante.
//   disponible → nothing used yet
//   en_usage   → partially consumed
//   epuise     → fully consumed
stockSemenceSchema.pre('save', function () {
  if (this.quantiteRestante <= 0) this.statut = 'epuise';
  else if (this.quantiteRestante < this.quantiteInitiale) this.statut = 'en_usage';
  else this.statut = 'disponible';
});

// ── Cascade Protection ─────────────────────────────────────────────
// Block deletion if movements or germination tests exist.

stockSemenceSchema.pre('findOneAndDelete', async function () {
  const stockId = this.getFilter()._id;
  if (!stockId) return;

  const StockMouvement = require('./StockMouvement');
  const StockGerminationTest = require('./StockGerminationTest');
  
  const mouvementCount = await StockMouvement.countDocuments({ stockSemence: stockId });
  const testCount = await StockGerminationTest.countDocuments({ stockSemence: stockId });
  
  let errors = [];
  if (mouvementCount > 0) {
    errors.push(mouvementCount + ' mouvement(s)');
  }
  if (testCount > 0) {
    errors.push(testCount + ' test(s) de germination');
  }
  
  if (errors.length > 0) {
    throw new Error(
      'Impossible de supprimer ce stock : ' + errors.join(' et ') +
      ' lui sont associés. Supprimez d\'abord ces entités.'
    );
  }
});

// ── Indexes ──
stockSemenceSchema.index({ variete: 1 });
stockSemenceSchema.index({ statut: 1 });
stockSemenceSchema.index({ dateReception: -1 });
stockSemenceSchema.index({ code: -1 });

module.exports = mongoose.model('StockSemence', stockSemenceSchema);
