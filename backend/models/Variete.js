/**
 * Variete Model — Plant Variety / Cultivar
 * =========================================
 *
 * A catalog of plant varieties that can be used across pepinieres.
 * Varieties are referenced by lots and semis.
 *
 * Fields:
 *   code   — Auto-generated unique code (format: v-001)
 *   nom    — Variety name (e.g., 'ercole', 'h1879')
 *   statut — 'active' (can be used) or 'inactive' (discontinued)
 *
 * Only active varieties are shown in dropdowns for creating new lots/semis.
 */

const mongoose = require('mongoose');

const varieteSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  nom: { type: String, required: true },
  statut: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, { timestamps: true });

// ── Cascade Protection ─────────────────────────────────────────────
// Block deletion if semis or lots reference this variete.

varieteSchema.pre('findOneAndDelete', async function () {
  const varieteId = this.getFilter()._id;
  if (!varieteId) return;

  const Semis = require('./Semis');
  const Lot = require('./Lot');

  const semisCount = await Semis.countDocuments({ variete: varieteId });
  
  const semisIds = (await Semis.find({ variete: varieteId }).select('_id').lean()).map(s => s._id);
  const lotsCount = await Lot.countDocuments({ semis: { $in: semisIds } });

  if (semisCount > 0 || lotsCount > 0) {
    throw new Error(
      'Impossible de supprimer cette variété : ' +
      (semisCount > 0 ? semisCount + ' semis' : '') +
      (semisCount > 0 && lotsCount > 0 ? ' et ' : '') +
      (lotsCount > 0 ? lotsCount + ' lots' : '') +
      ' lui sont associés. Transférez ou supprimez d\'abord ces entités.'
    );
  }
});

//  Indexes 
varieteSchema.index({ statut: 1 });    // Active varieties queries
varieteSchema.index({ nom: 1 });        // Sorting by name

module.exports = mongoose.model('Variete', varieteSchema);