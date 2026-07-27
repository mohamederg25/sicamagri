/**
 * Pepiniere Model — Nursery / Greenhouse Site
 * ============================================
 *
 * A physical production site where seeds are received, tested, and
 * plants are grown. Each pepiniere can have multiple lots (batches).
 *
 * Key fields:
 *   code          — Auto-generated unique code (format: PE001)
 *   nom           — Name of the nursery
 *   address       — Physical address (optional)
 *   number        — Contact phone number (optional)
 *   email         — Contact email (optional)
 *   surface       — Total area in hectares (optional)
 *   statut        — 'actif' or 'non actif'
 *   ingenieur     — The single engineer assigned to this site
 *
 * Relationships:
 *   Pepiniere  Lot (one pepiniere has many lots)
 *                Semis (one pepiniere has many semis entries)
 *                User (via ingenieur; 1-to-1)
 *
 * Role filtering:
 *   Users with role 'ingenieur' only see the pepiniere they are
 *   assigned to. Admins see all. Employees/Visiteurs see all
 *   but with limited actions.
 */

const mongoose = require('mongoose');

const pepiniereSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  nom: { type: String, required: true },
  address: { type: String, default: '' },
  number: { type: String, default: '' },
  email: { type: String, default: '' },
  statut: { type: String, enum: ['actif', 'non actif'], default: 'actif' },
  ingenieur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

// ── Cascade Protection ─────────────────────────────────────────────
// Block deletion if semis or lots reference this pepiniere.

pepiniereSchema.pre('findOneAndDelete', async function () {
  const pepId = this.getFilter()._id;
  if (!pepId) return;

  const Semis = require('./Semis');
  const Lot = require('./Lot');

  const semisCount = await Semis.countDocuments({ pepiniere: pepId });
  
  const semisIds = (await Semis.find({ pepiniere: pepId }).select('_id').lean()).map(s => s._id);
  const lotsCount = await Lot.countDocuments({ semis: { $in: semisIds } });

  if (semisCount > 0 || lotsCount > 0) {
    throw new Error(
      'Impossible de supprimer cette pépinière : ' +
      (semisCount > 0 ? semisCount + ' semis' : '') +
      (semisCount > 0 && lotsCount > 0 ? ' et ' : '') +
      (lotsCount > 0 ? lotsCount + ' lots' : '') +
      ' lui sont associés. Transférez ou supprimez d\'abord ces entités.'
    );
  }
});

//  Indexes 
// Common query patterns:
// - Ingenieurs see only assigned pepiniere: find({ ingenieur: userId })
// - Active pepinieres for dropdowns: find({ statut: 'actif' })
pepiniereSchema.index({ ingenieur: 1 });         // Ingenieur role filtering
pepiniereSchema.index({ statut: 1 });            // Active pepinieres queries
pepiniereSchema.index({ nom: 1 });                // Sorting by name

module.exports = mongoose.model('Pepiniere', pepiniereSchema);
