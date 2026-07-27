/**
 * Fournisseur Model — Seed Supplier
 * ==================================
 *
 * Represents a seed supplier/vendor. Stock entries (StockSemence)
 * can optionally reference a Fournisseur to track seed origin.
 *
 * Fields:
 *   code    — Auto-generated unique code (format: F0001)
 *   nom     — Supplier name (required)
 *   contact — Optional contact person
 *   email   — Optional email address
 *   telephone — Optional phone number
 *   adresse — Optional address
 *   statut  — 'actif' or 'inactif'
 */

const mongoose = require('mongoose');

const fournisseurSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  nom: { type: String, required: true },
  contact: { type: String, default: '' },
  email: { type: String, default: '' },
  telephone: { type: String, default: '' },
  adresse: { type: String, default: '' },
  statut: {
    type: String,
    enum: ['actif', 'inactif'],
    default: 'actif'
  }
}, { timestamps: true });

// ── Cascade Protection ──
fournisseurSchema.pre('findOneAndDelete', async function () {
  const fournisseurId = this.getFilter()._id;
  if (!fournisseurId) return;

  const StockSemence = require('./StockSemence');
  const count = await StockSemence.countDocuments({ fournisseur: fournisseurId });
  if (count > 0) {
    throw new Error(
      `Impossible de supprimer ce fournisseur : ${count} entrée(s) de stock lui sont associées.`
    );
  }
});

fournisseurSchema.index({ statut: 1 });
fournisseurSchema.index({ nom: 1 });

module.exports = mongoose.model('Fournisseur', fournisseurSchema);
