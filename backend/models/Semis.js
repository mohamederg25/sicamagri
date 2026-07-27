/**
 * Semis Model — Seedling Receipt / Seed Entry
 * ============================================
 *
 * A "semis" records seeds received at a nursery for a specific variety.
 * It's the starting point of the production pipeline: seeds come in,
 * and are used for planting (Production lots).
 *
 * Key concepts:
 *   - A semis represents seed quantities added to stock
 *   - Multiple semis can exist for the same (pepiniere, variete) pair
 *   - The stock aggregation (RECU / UTILISE / DISPONIBLE) is computed
 *     in the controller by summing semis quantities and subtracting
 *     production lot quantities
 *
 * Stock formula (computed in semisController.getSemisList):
 *   RECU       = SUM(semis.quantitePrevue) for (pepiniere, variete)
 *   UTILISE    = SUM(production lots.quantite) for (pepiniere, variete)
 *   DISPONIBLE = max(0, RECU - UTILISE)
 *
 * Code prefix: SXXX (e.g., S001, S042)
 */

const mongoose = require('mongoose');

const semisSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  variete: { type: mongoose.Schema.Types.ObjectId, ref: 'Variete', required: true },
  // ── Type de sortie ──
  // 'pepiniere' = sortie vers une pépinière (nécessite pepinière de destination)
  // 'externe'   = sortie externe (pas de pépinière, juste un motif)
  type: {
    type: String,
    enum: ['pepiniere', 'externe'],
    default: 'pepiniere'
  },
  pepiniere: { type: mongoose.Schema.Types.ObjectId, ref: 'Pepiniere', required: false },
  // ── Motif pour les sorties externes ──
  motif: { type: String, default: '' },
  quantite: { type: Number, required: true },
  quantiteUtilisee: { type: Number, default: 0 },
  statut: {
    type: String,
    enum: ['prevue', 'en_cours', 'realisee', 'annulee'],
    default: 'prevue'
  },
  // ── Germination rate inherited from source Stock ──
  // Set automatically when a Semis is created via sortie_pepiniere
  tauxGermination: { type: Number, min: 0, max: 100, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  productionRuleRef: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionRule', default: null },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Virtual: lotsProduction — Production lots linked to this semis.
 * Uses the `semis` field on Lot documents.
 */
semisSchema.virtual('lotsProduction', {
  ref: 'Lot',
  localField: '_id',
  foreignField: 'semis',
  match: { type: 'production' },
  justOne: false
});

/**
 * Virtual: disponible — Available seeds = quantite - quantiteUtilisee
 */
semisSchema.virtual('disponible').get(function () {
  return Math.max(0, (this.quantite || 0) - (this.quantiteUtilisee || 0));
});

// ── Cascade Protection ─────────────────────────────────────────────
// Block deletion if linked lots exist.

semisSchema.pre('findOneAndDelete', async function () {
  const semisId = this.getFilter()._id;
  if (!semisId) return;

  const Lot = require('./Lot');
  const lotsCount = await Lot.countDocuments({ semis: semisId });
  if (lotsCount > 0) {
    throw new Error(
      'Impossible de supprimer ce semis : ' + lotsCount +
      ' lot(s) lui sont associés. Supprimez d\'abord les lots.'
    );
  }
});

//  Indexes 
// Common query patterns:
// - Stock aggregation: find({ pepiniere, variete })
// - Ingenieur filtering: find({ pepiniere: { $in: ids } })
// - Code generation: sort({ code: -1 })
semisSchema.index({ pepiniere: 1, variete: 1 });   // Stock lookup (the main query)
semisSchema.index({ pepiniere: 1 });                 // Ingenieur role filtering
semisSchema.index({ code: -1 });                      // Code generation
semisSchema.index({ statut: 1 });                     // Status filtering

module.exports = mongoose.model('Semis', semisSchema);
