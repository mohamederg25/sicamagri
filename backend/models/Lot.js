/**
 * Lot Model — Seed Batch
 * =======================
 *
 * A "lot" is a batch of seeds tracked through the production pipeline.
 * There are two distinct types:
 * *
 *   Semis (seedling receipt)                                    
 *                                                              
 *   Lot (Production)  ← seeds with known germination rate       
 *                      for actual planting                     
 *
 *   Plants delivered / tracked
 *
 *
 * Business rules:
 *   - A production lot links directly to the source StockSemence (warehouse stock)
 *   - Germination rate is taken from the linked StockSemence (tauxManuel or StockGerminationTest)
 *   - stockRef stores the reference to the source warehouse stock entry
 *
 * Code prefixes:
 *   PRXXX  → Production (e.g., PR001, PR042)
 */

const mongoose = require('mongoose');

const lotSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  type: {
    type: String,
    enum: ['production'],
    default: 'production',
    required: true
  },
  quantite: { type: Number, min: 1, required: false },
  dateEntree: { type: Date, default: Date.now },
  source: { type: String },
  // ── Stock reference ──
  stockRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockSemence',
    default: null,
  },
  // ── Germination rate at time of lot creation (snapshot) ──
  tauxGermination: { type: Number, min: 0, max: 100, default: null },
  lotSemenceParent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lot',
    default: null,
    required: false
  },
  semis: { type: mongoose.Schema.Types.ObjectId, ref: 'Semis', default: null },
  
  expectedReadyDateMin: { type: Date, default: null },
  expectedReadyDateMax: { type: Date, default: null },
  maturityWindowEnd: { type: Date, default: null },
  productionRuleRef: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionRule', default: null },

  // ── Growth Observations (during growth phase) ─────────
  observations: [{
    message: { type: String, default: '' },
    germinationJ7: { type: Number, min: 0, max: 100, default: null },
    germinationJ14: { type: Number, min: 0, max: 100, default: null },
    date: { type: Date, default: Date.now },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  // Latest germination values (kept for quick access / display)
  germinationJ7: { type: Number, min: 0, max: 100, default: null },
  germinationJ14: { type: Number, min: 0, max: 100, default: null },

  // ── Production Status (for production lots) ────────────
  statut: {
    type: String,
    enum: ['en_cours', 'pret', 'recolte', 'livre', 'annule'],
    default: function () {
      return this.type === 'production' ? 'en_cours' : undefined;
    },
  },
  dateRecolte: { type: Date, default: null },
  nombrePlantsProduits: { type: Number, min: 0, default: 0 },

  // ── Delivery ───────────────────────────────────────────
  dateLivraison: { type: Date, default: null },
  quantiteLivree: { type: Number, min: 0, default: null },

  // ── Events (Production timeline) ───────────────────────
  events: [{
    type: { type: String, enum: ['creation', 'recolte', 'livraison', 'note'], required: true },
    message: { type: String, required: true },
    date: { type: Date, default: Date.now },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Virtual: lotsProduction — Production lots created from this lot.
 * Links via lotSemenceParent field.
 */
lotSchema.virtual('lotsProduction', {
  ref: 'Lot',
  localField: '_id',
  foreignField: 'lotSemenceParent',
  justOne: false
});

// ── Cascade Protection ─────────────────────────────────────────────
// Also decrement Semis.quantiteUtilisee when a lot is deleted.

/**
 * Pre-delete hook: findOneAndDelete
 * Decrements semis.quantiteUtilisee when deleting a lot that consumes seeds.
 */
lotSchema.pre('findOneAndDelete', async function () {
  const lotId = this.getFilter()._id;
  if (!lotId) return;

  // Decrement Semis.quantiteUtilisee if this lot consumed seeds
  const Semis = require('./Semis');
  const lot = await this.model.findById(lotId).select('semis quantite type').lean();
  if (lot && lot.semis && lot.quantite) {
    await Semis.findByIdAndUpdate(lot.semis, {
      $inc: { quantiteUtilisee: -lot.quantite },
    });
  }
});

//  Indexes 
// Common query patterns:
// - Code generation: find({ type }).sort({ code: -1 })
lotSchema.index({ type: 1, code: -1 });                      // Code generation
lotSchema.index({ semis: 1 });                                 // Semis-based lookup
lotSchema.index({ lotSemenceParent: 1 });                     // Parent lot lookups
lotSchema.index({ stockRef: 1 });                                // Stock reference lookups
lotSchema.index({ dateEntree: -1 });                          // Date-based sorting

module.exports = mongoose.model('Lot', lotSchema);
