/**
 * Lot Service — Business Logic for Seed Batch Operations
 * ========================================================
 *
 * Handles the complex rules around lot creation:
 * - Lots link to a Semis (semis mère) — pepiniere/variete are derived from it
 * - Production lots need a parent test lot with a valid germination rate
 * - Semis reference resolution (by explicit ID → source code → from parent)
 */

const Lot = require('../models/Lot');
const Semis = require('../models/Semis');
const StockSemence = require('../models/StockSemence');
const { generateCode } = require('../utils/codeGenerator');
const { AppError } = require('../utils/response');
const productionRuleService = require('./productionRuleService');
const productionService = require('./productionService');

/**
 * Compute the best germination rate from a StockSemence entry.
 * Looks at both formal tests (StockGerminationTest) and manual rate.
 */
const computeStockGermination = async (stockId) => {
  const StockGerminationTest = require('../models/StockGerminationTest');
  const stock = await StockSemence.findById(stockId)
    .populate('germinationTests')
    .lean();
  if (!stock) return null;

  if (stock.germinationTests && stock.germinationTests.length > 0) {
    const sorted = [...stock.germinationTests].sort(
      (a, b) => new Date(b.dateTest) - new Date(a.dateTest)
    );
    const latest = sorted[0];
    if (latest && latest.grainesTestees > 0) {
      return Math.round((latest.grainesGermees / latest.grainesTestees) * 100);
    }
  }
  if (stock.tauxManuel != null) {
    return stock.tauxManuel;
  }
  return null;
};

/**
 * Build the lot data object for creation.
 *
 * @param {Object} body - Request body (stockRef, semis, quantite, dateEntree, etc.)
 */
const buildLotData = async (body) => {
  const code = await generateCode(Lot, 'R', { type: 'production' });

  const lotData = {
    code,
    type: 'production',
    dateEntree: body.dateEntree,
    source: body.source || '',
    stockRef: body.stockRef || null,
    semis: body.semis || null,
  };

  // Production lots require quantity
  if (!body.quantite || body.quantite <= 0) {
    throw new AppError('La quantité à planter est requise pour les lots de production', 400);
  }
  lotData.quantite = body.quantite;

  // ── Date validation: dateEntree must be >= semis.createdAt ──
  if (body.semis && body.dateEntree) {
    const semisDoc = await Semis.findById(body.semis).select('createdAt').lean();
    if (semisDoc?.createdAt) {
      const lotDate = new Date(body.dateEntree);
      const semisDate = new Date(semisDoc.createdAt);
      semisDate.setHours(0, 0, 0, 0);
      lotDate.setHours(0, 0, 0, 0);
      if (lotDate < semisDate) {
        throw new AppError(
          `La date du lot de production (${lotDate.toLocaleDateString('fr-FR')}) ne peut pas être antérieure à la date du semis source (${semisDate.toLocaleDateString('fr-FR')}).`,
          400
        );
      }
    }
  }

  // ── Snapshot the germination rate ──
  // Priority: Semis.tauxGermination (inherited from stock) > StockSemence
  if (body.semis) {
    const semisDoc = await Semis.findById(body.semis).select('tauxGermination').lean();
    if (semisDoc?.tauxGermination != null) {
      lotData.tauxGermination = semisDoc.tauxGermination;
    }
  } else if (body.stockRef) {
    const taux = await computeStockGermination(body.stockRef);
    if (taux != null) {
      lotData.tauxGermination = taux;
    }
  }

  // ── Production Duration Calculation ──────────────────────────
  // Get variete from semis first, then fall back to stockRef
  let varieteId = null;
  if (body.semis) {
    const semisDoc = await Semis.findById(body.semis).select('variete').lean();
    varieteId = semisDoc?.variete;
  }
  if (!varieteId && body.stockRef) {
    const stock = await StockSemence.findById(body.stockRef).select('variete').populate('variete', '_id').lean();
    varieteId = stock?.variete?._id || null;
  }

  let ruleResolution = null;

  // Strategy 1: Get rule from the Semis document (bound at creation time)
  if (!ruleResolution && body.semis) {
    const semisDoc = await Semis.findById(body.semis).select('productionRuleRef createdAt').populate('productionRuleRef').lean();
    if (semisDoc?.productionRuleRef) {
      const rule = semisDoc.productionRuleRef;
      const sowingDate = body.dateEntree || semisDoc.createdAt || new Date();
      const dates = productionRuleService.calculateDatesFromRule(rule, sowingDate);
      ruleResolution = { rule, dates };
    }
  }

  // Strategy 2: Dynamic resolution from variete (fallback)
  if (!ruleResolution && varieteId) {
    const sowingDate = body.dateEntree || new Date();
    ruleResolution = await productionRuleService.resolveRuleAndDates(sowingDate, varieteId);
  }

  if (ruleResolution) {
    lotData.expectedReadyDateMin = ruleResolution.dates.expectedReadyDateMin;
    lotData.expectedReadyDateMax = ruleResolution.dates.expectedReadyDateMax;
    lotData.maturityWindowEnd = ruleResolution.dates.maturityWindowEnd;
    lotData.productionRuleRef = ruleResolution.rule._id;
  }
  // If no rule matches, dates remain null — handled gracefully in frontend

  return lotData;
};



/**
 * Mark a production lot as harvested.
 */
const markHarvest = async (lotId, userId, nombrePlantsProduits = null) => {
  const lot = await Lot.findById(lotId)
    .populate({ path: 'stockRef', select: 'tauxManuel', populate: { path: 'germinationTests', options: { sort: { dateTest: -1 } } } });

  if (!lot) throw new AppError('Lot non trouvé', 404);
  if (lot.type !== 'production') {
    throw new AppError('Seuls les lots de production peuvent être récoltés', 400);
  }
  if (lot.statut === 'recolte' || lot.statut === 'livre') {
    throw new AppError('Ce lot a déjà été récolté ou livré', 400);
  }

  // ── Maturity Window Validation ──────────────────────────────
  if (lot.expectedReadyDateMin || lot.maturityWindowEnd) {
    const today = new Date();
    // Normalize dates to remove time component for day-level comparison
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const minDate = lot.expectedReadyDateMin
      ? new Date(lot.expectedReadyDateMin.getFullYear(), lot.expectedReadyDateMin.getMonth(), lot.expectedReadyDateMin.getDate())
      : null;
    const maxDate = lot.maturityWindowEnd
      ? new Date(lot.maturityWindowEnd.getFullYear(), lot.maturityWindowEnd.getMonth(), lot.maturityWindowEnd.getDate())
      : null;

    if (minDate && todayStart < minDate) {
      throw new AppError(
        `Ce lot n'a pas encore atteint sa fenêtre de maturité (ouverte à partir du ${minDate.toLocaleDateString('fr-FR')})`,
        400
      );
    }

    if (maxDate && todayStart > maxDate) {
      throw new AppError(
        `La fenêtre de maturité de ce lot est dépassée (expirée depuis le ${maxDate.toLocaleDateString('fr-FR')})`,
        400
      );
    }
  }

  // ── Validation ──────────────────────────────────────────────
  // Manual harvest quantity cannot exceed the planted quantity
  if (nombrePlantsProduits != null && Number(nombrePlantsProduits) > lot.quantite) {
    throw new AppError(
      `Le nombre de plantes produites (${nombrePlantsProduits}) ne peut pas dépasser la quantité plantée (${lot.quantite})`,
      400
    );
  }

  let finalPlantsProduits = nombrePlantsProduits;

  // Auto-calculate from lot's stored germination rate if not provided
  if (finalPlantsProduits === null) {
    let germinationRate = lot.tauxGermination;

    if (germinationRate != null && lot.quantite) {
      finalPlantsProduits = Math.round((lot.quantite * germinationRate) / 100);
    } else if (lot.quantite) {
      finalPlantsProduits = lot.quantite; // Fallback
    }
  }

  const today = new Date();
  const updates = {
    statut: 'recolte',
    dateRecolte: today,
    nombrePlantsProduits: finalPlantsProduits !== null ? Number(finalPlantsProduits) : 0,
  };

  const eventEntry = {
    type: 'recolte',
    message: finalPlantsProduits
      ? `Lot récolté - ${finalPlantsProduits} plantes produites`
      : 'Lot récolté',
    date: today,
    user: userId,
  };

  await Lot.findByIdAndUpdate(lotId, {
    $set: updates,
    $push: { events: eventEntry },
  }, { new: true, runValidators: true });

  return Lot.findById(lotId)
    .populate({ path: 'semis', populate: [{ path: 'pepiniere', select: 'nom' }, { path: 'variete', select: 'nom statut' }] })
    .populate({ path: 'lotSemenceParent', select: 'code' })
    .populate({ path: 'stockRef', select: 'code variete tauxManuel', populate: { path: 'variete', select: 'nom' } });
};

/**
 * Auto-mark lots as "pret" (ready) when their expectedReadyDateMin has passed.
 * Transitions from "en_cours" → "pret" automatically with event logging.
 */
const autoMarkReadyLots = async () => {
  const today = new Date();
  
  // Find all production lots that are still "en_cours" but past their ready date
  const lotsToUpdate = await Lot.find({
    type: 'production',
    statut: 'en_cours',
    expectedReadyDateMin: { $lte: today },
  }).select('_id code dateEntree expectedReadyDateMin');

  if (lotsToUpdate.length === 0) return [];

  const eventEntry = {
    type: 'note',
    message: 'Lot automatiquement marqué prêt (cycle terminé)',
    date: today,
  };

  // Update each lot individually to push events
  const updatePromises = lotsToUpdate.map(lot =>
    Lot.findByIdAndUpdate(lot._id, {
      $set: { statut: 'pret' },
      $push: { events: eventEntry },
    }, { new: true })
  );
  
  await Promise.all(updatePromises);

  console.log(`[autoMarkReady] ${lotsToUpdate.length} lot(s) auto-transitioned to "pret"`);
  
  return lotsToUpdate.map(l => l._id);
};

/**
 * Get harvested/completed production lots (for history page).
 */
const getHistory = async (user) => {
  let query = { type: 'production', statut: { $in: ['recolte', 'livre'] } };

  // Role-based filtering
  if (user && user.role === 'ingenieur') {
    const Pepiniere = require('../models/Pepiniere');
    const Semis = require('../models/Semis');
    const peps = await Pepiniere.find({ ingenieur: user._id }).select('_id').lean();
    const pepIds = peps.map((p) => p._id);
    const semis = await Semis.find({ pepiniere: { $in: pepIds.length > 0 ? pepIds : ['__none__'] } }).select('_id').lean();
    const semisIds = semis.map((s) => s._id);
    query.semis = { $in: semisIds.length > 0 ? semisIds : ['__none__'] };
  }

  return Lot.find(query)
    .populate({
      path: 'semis',
      select: 'code pepiniere variete',
      populate: [
        { path: 'pepiniere', select: 'nom code' },
        { path: 'variete', select: 'nom code' },
      ],
    })
    .populate({ path: 'stockRef', select: 'code variete tauxManuel', populate: { path: 'variete', select: 'nom' } })
    .populate({ path: 'events.user', select: 'nom' })
    .sort({ dateRecolte: -1, updatedAt: -1 });
};

/**
 * Mark a production lot as ready (prêt) for harvest.
 * Transitions statut from 'en_cours' → 'pret'.
 */
const markReady = async (lotId, userId) => {
  const lot = await Lot.findById(lotId);
  if (!lot) throw new AppError('Lot non trouvé', 404);
  if (lot.type !== 'production') {
    throw new AppError('Seuls les lots de production peuvent être marqués prêts', 400);
  }
  if (lot.statut !== 'en_cours') {
    throw new AppError('Ce lot n\'est pas en cours de production', 400);
  }

  const today = new Date();
  const updates = { statut: 'pret' };

  const eventEntry = {
    type: 'note',
    message: 'Lot marqué prêt pour la récolte',
    date: today,
    user: userId,
  };

  await Lot.findByIdAndUpdate(lotId, {
    $set: updates,
    $push: { events: eventEntry },
  }, { new: true, runValidators: true });

  return Lot.findById(lotId)
    .populate({ path: 'semis', populate: [{ path: 'pepiniere', select: 'nom' }, { path: 'variete', select: 'nom statut' }] })
    .populate({ path: 'lotSemenceParent', select: 'code' });
};

/**
 * Mark a harvested production lot as delivered.
 */
const markDelivery = async (lotId, userId, { dateLivraison, quantiteLivree } = {}) => {
  const lot = await Lot.findById(lotId);

  if (!lot) throw new AppError('Lot non trouvé', 404);
  if (lot.type !== 'production') {
    throw new AppError('Seuls les lots de production peuvent être livrés', 400);
  }
  if (lot.statut === 'livre') {
    throw new AppError('Ce lot a déjà été livré', 400);
  }
  if (lot.statut !== 'recolte') {
    throw new AppError('Le lot doit d\'abord être récolté avant d\'être livré', 400);
  }

  // ── Validation ──────────────────────────────────────────────
  // Delivery quantity cannot exceed the harvested quantity
  if (quantiteLivree != null && Number(quantiteLivree) > lot.nombrePlantsProduits) {
    throw new AppError(
      `La quantité livrée (${quantiteLivree}) ne peut pas dépasser le nombre de plantes produites (${lot.nombrePlantsProduits})`,
      400
    );
  }

  const today = new Date();
  const updates = {
    statut: 'livre',
    dateLivraison: dateLivraison || today,
  };

  if (quantiteLivree != null) {
    updates.quantiteLivree = Number(quantiteLivree);
  }

  const eventEntry = {
    type: 'livraison',
    message: 'Lot livré',
    date: today,
    user: userId,
  };

  await Lot.findByIdAndUpdate(lotId, {
    $set: updates,
    $push: { events: eventEntry },
  }, { new: true, runValidators: true });

  const updatedLot = await Lot.findById(lotId)
    .populate({ path: 'semis', populate: [{ path: 'pepiniere', select: 'nom' }, { path: 'variete', select: 'nom statut' }] })
    .populate({ path: 'lotSemenceParent', select: 'code' })
    .populate({ path: 'stockRef', select: 'code variete tauxManuel', populate: { path: 'variete', select: 'nom' } });

  // ── Auto-record production record for company tracking ────
  try {
    await productionService.recordProductionOnDelivery(updatedLot, userId);
  } catch (err) {
    // Non-blocking: log error but don't fail the delivery
    console.error('[autoRecord] Échec de l\'enregistrement de production:', err.message);
  }

  return updatedLot;
};

/**
 * Add an observation note to a production lot (during growth phase).
 * Each call pushes a new entry to the observations array (history).
 *
 * Handles backward compatibility: if observations is still a string
 * (from before the migration to array), it converts it first.
 */
const addNote = async (lotId, userId, { message, germinationJ7, germinationJ14 }) => {
  const lot = await Lot.findById(lotId);
  if (!lot) throw new AppError('Lot non trouvé', 404);
  if (lot.type !== 'production') {
    throw new AppError('Seuls les lots de production peuvent avoir des observations', 400);
  }

  const updates = {};

  // Update top-level latest germination values
  if (germinationJ7 != null) {
    updates.germinationJ7 = Number(germinationJ7);
  }
  if (germinationJ14 != null) {
    updates.germinationJ14 = Number(germinationJ14);
  }

  // Push a new observation entry to the history array
  const observationEntry = {
    message: message || '',
    date: new Date(),
    user: userId,
  };
  if (germinationJ7 != null) observationEntry.germinationJ7 = Number(germinationJ7);
  if (germinationJ14 != null) observationEntry.germinationJ14 = Number(germinationJ14);

  const eventEntry = {
    type: 'note',
    message: message || (germinationJ7 != null ? 'Germination J+7 enregistrée' : germinationJ14 != null ? 'Germination J+14 enregistrée' : 'Observation ajoutée'),
    date: new Date(),
    user: userId,
  };

  // ── Backward compatibility ─────────────────────────────────
  // If observations is still a string (pre-migration), convert to array first
  if (typeof lot.observations === 'string' && lot.observations) {
    await Lot.findByIdAndUpdate(lotId, {
      $set: { observations: [{ message: lot.observations, date: lot.dateEntree || lot.createdAt }] }
    });
  }

  const updateOps = {
    $push: {
      observations: observationEntry,
      events: eventEntry,
    },
  };

  // Also update top-level germination fields if provided
  if (Object.keys(updates).length > 0) {
    updateOps.$set = updates;
  }

  await Lot.findByIdAndUpdate(lotId, updateOps, { new: true, runValidators: true });

  return Lot.findById(lotId)
    .populate({ path: 'semis', populate: [{ path: 'pepiniere', select: 'nom' }, { path: 'variete', select: 'nom statut' }] })
    .populate({ path: 'lotSemenceParent', select: 'code' })
    .populate({ path: 'stockRef', select: 'code variete tauxManuel', populate: { path: 'variete', select: 'nom' } })
    .populate({ path: 'observations.user', select: 'nom' });
};

module.exports = {
  buildLotData,
  markReady,
  markHarvest,
  markDelivery,
  getHistory,
  addNote,
  autoMarkReadyLots,
};
