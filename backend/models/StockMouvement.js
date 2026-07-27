/**
 * StockMouvement Model — Seed Stock Movement
 * ============================================
 *
 * Tracks every movement from the SICAM seed warehouse:
 *   0. entree_stock — Seeds received into warehouse (creates the stock entry)
 *   1. sortie_pepiniere — Seeds sent to a nursery (creates a Semis)
 *   2. bon_passage — Simple exit document (no nursery)
 *   3. test_germination — Seeds consumed for a formal germination test
 *
 * entree_stock does NOT decrement stock (it RECORDS the initial creation).
 * All other types decrement the parent StockSemence.quantiteRestante.
 */

const mongoose = require('mongoose');

const stockMouvementSchema = new mongoose.Schema({
  stockSemence: { type: mongoose.Schema.Types.ObjectId, ref: 'StockSemence', required: true },
  type: {
    type: String,
    enum: ['entree_stock', 'sortie_pepiniere', 'bon_passage', 'test_germination'],
    required: true,
  },
  quantite: { type: Number, required: true, min: 1 },
  dateMouvement: { type: Date, default: Date.now },
  
  // For sortie_pepiniere: destination nursery and the created semis
  pepiniere: { type: mongoose.Schema.Types.ObjectId, ref: 'Pepiniere', default: null },
  semisCree: { type: mongoose.Schema.Types.ObjectId, ref: 'Semis', default: null },
  
  // For bon_passage: optional reference
  referenceBon: { type: String, default: '' },
  motif: { type: String, default: '' },
  
  // For test_germination: link to the germination test record
  germinationTestRef: { type: mongoose.Schema.Types.ObjectId, ref: 'StockGerminationTest', default: null },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ── Indexes ──
stockMouvementSchema.index({ stockSemence: 1, dateMouvement: -1 });
stockMouvementSchema.index({ type: 1 });
stockMouvementSchema.index({ pepiniere: 1 });
stockMouvementSchema.index({ dateMouvement: -1 });

module.exports = mongoose.model('StockMouvement', stockMouvementSchema);
