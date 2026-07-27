/**
 * Production Service — Production Records Management
 * ====================================================
 *
 * Handles automatic recording of production data when lots are delivered.
 * Each delivery creates a denormalized ProductionRecord for the company
 * to track all completed productions.
 */

const Lot = require('../models/Lot');
const Semis = require('../models/Semis');
const ProductionRecord = require('../models/ProductionRecord');
const { generateCode } = require('../utils/codeGenerator');
const { AppError } = require('../utils/response');

/**
 * Automatically create a ProductionRecord when a production lot is delivered.
 * This is called from lotService.markDelivery().
 *
 * @param {Object} lot - The populated Lot document (after delivery update)
 * @param {ObjectId} userId - The user who performed the delivery
 * @returns {Object} The created ProductionRecord
 */
const recordProductionOnDelivery = async (lot, userId) => {
  // ── Extract data from the lot & its semis ──
  const semis = lot.semis;
  const pepiniere = semis?.pepiniere || {};
  const variete = semis?.variete || {};

  const recordData = {
    code: lot.code,
    lotRef: lot._id,
    pepiniere: pepiniere.nom || '—',
    pepiniereId: pepiniere._id || null,
    semisCode: semis?.code || '—',
    semisId: semis?._id || null,
    variete: variete.nom || '—',
    varieteId: variete._id || null,
    quantitePlantee: lot.quantite || 0,
    quantiteProduite: lot.nombrePlantsProduits || 0,
    quantiteLivree: lot.quantiteLivree || lot.nombrePlantsProduits || 0,
    dateEntree: lot.dateEntree || null,
    dateRecolte: lot.dateRecolte || null,
    dateLivraison: lot.dateLivraison || new Date(),
    createdBy: userId,
  };

  return ProductionRecord.create(recordData);
};

/**
 * Get all production records, sorted by delivery date descending.
 */
const getAllRecords = async () => {
  return ProductionRecord.find({}).sort({ dateLivraison: -1 }).lean();
};

module.exports = { recordProductionOnDelivery, getAllRecords };
