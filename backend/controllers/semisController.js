const Semis = require('../models/Semis');
const Lot = require('../models/Lot');
const { generateCode } = require('../utils/codeGenerator');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendMessage, AppError } = require('../utils/response');
const semisService = require('../services/semisService');
const activityLogger = require('../services/activityLogger');

/** GET /api/semis/all — get all individual semis entries */
exports.getAllSemis = asyncHandler(async (req, res) => {
  const query = {};
  // Add pepiniere filter for ingenieurs (from getPepiniereScope)
  const { getPepiniereScope } = require('../utils/roleFilter');
  const pepScope = await getPepiniereScope(req.user);
  if (pepScope.pepiniere) {
    query.pepiniere = pepScope.pepiniere;
  }
  
  const semis = await Semis.find(query)
    .populate('variete', 'nom')
    .populate('pepiniere', 'nom')
    .lean();
  sendSuccess(res, semis, 'Liste des semis');
});

/** GET /api/semis — aggregated stock overview */
exports.getSemisList = asyncHandler(async (req, res) => {
  const stock = await semisService.computeFullStock(req.user, req.query.pepiniere);
  sendSuccess(res, stock, 'Aperçu des stocks');
});

/** GET /api/semis/:id — detailed view of a single semis entry */
exports.getSemisById = asyncHandler(async (req, res) => {
  const semis = await Semis.findById(req.params.id)
    .populate('variete', 'nom')
    .populate('pepiniere', 'nom')
    .populate('createdBy', 'nom');

  if (!semis) throw new AppError('Semis not found', 404);

  // Check ingenieur access (skip for external semis without pepiniere)
  if (semis.pepiniere) {
    await semisService.checkIngenieurAccess(req.user, semis.pepiniere._id);
  }

  // Compute stock summary (only for pepiniere semis)
  const stockSummary = semis.pepiniere
    ? await semisService.computeSingleStockSummary(semis)
    : null;

  await semis.populate('lotsProduction');

  // Get lotsProduction — fallback to computed list if virtual is empty
  const productionLots = await Lot.find({
    type: 'production',
    semis: semis._id,
  });
  const allProductionLots = semis.lotsProduction && semis.lotsProduction.length > 0
    ? semis.lotsProduction
    : productionLots;

  // Compute production estimates (now async — uses ProductionRules)
  const production = await semisService.computeProductionEstimate(semis);

  sendSuccess(res, {
    ...semis.toObject(),
    stockSummary,
    lotsProduction: allProductionLots,
    production,
  });
});

/** POST /api/semis — create a new semis entry (pepinière only) */
exports.createSemis = asyncHandler(async (req, res) => {
  const { dateSemis, stockRef, ...semisData } = req.body;

  // Reject external sorties — they must use the stock movement endpoint (bon_passage)
  if (semisData.type === 'externe') {
    throw new AppError(
      'Les sorties externes ne créent pas de semis. Utilisez l\'API mouvement de stock (bon_passage).',
      400
    );
  }

  const code = await generateCode(Semis, 'S');

  // ── Inherit germination rate from stock if provided ──
  let tauxGermination = null;
  if (stockRef) {
    const StockSemence = require('../models/StockSemence');
    const stockService = require('../services/stockService');
    const stock = await StockSemence.findById(stockRef)
      .populate('germinationTests')
      .lean();
    if (stock) {
      tauxGermination = stockService.computeTauxGermination(stock);

      // ── Date validation: dateSemis cannot be before dateReception ──
      if (dateSemis && stock.dateReception) {
        const semisDate = new Date(dateSemis);
        const recDate = new Date(stock.dateReception);
        recDate.setHours(0, 0, 0, 0);
        semisDate.setHours(0, 0, 0, 0);
        if (semisDate < recDate) {
          throw new AppError(
            `La date de semis (${semisDate.toLocaleDateString('fr-FR')}) ne peut pas être antérieure à la date de réception du stock (${recDate.toLocaleDateString('fr-FR')}).`,
            400
          );
        }
      }

      // ── Validate dateSemis is not in the future ──
      if (dateSemis) {
        const semisDate = new Date(dateSemis);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (semisDate > today) {
          throw new AppError('La date de semis ne peut pas être dans le futur.', 400);
        }
      }
    }
  }

  const semis = await Semis.create({ ...semisData, code, tauxGermination, createdBy: req.user._id });

  // ── Decrement stock quantity and create movement audit trail ──
  if (stockRef && semisData.quantite) {
    const StockSemence = require('../models/StockSemence');
    const StockMouvement = require('../models/StockMouvement');

    const stockDoc = await StockSemence.findById(stockRef);
    if (stockDoc) {
      const quantite = Number(semisData.quantite);

      // Validate stock availability
      if (quantite > stockDoc.quantiteRestante) {
        await Semis.findByIdAndDelete(semis._id);
        throw new AppError(
          `Stock insuffisant : la quantité demandée (${quantite}) dépasse le disponible (${stockDoc.quantiteRestante})`,
          400
        );
      }

      // Decrement stock
      stockDoc.quantiteRestante -= quantite;
      await stockDoc.save();

      // Create audit trail movement
      await StockMouvement.create({
        stockSemence: stockRef,
        type: 'sortie_pepiniere',
        quantite,
        dateMouvement: new Date(),
        pepiniere: semisData.pepiniere,
        semisCree: semis._id,
        motif: 'Sortie en pépinière',
        createdBy: req.user._id,
      });

      // ── Real-time notification if stock became ended ──
      if (stockDoc.statut === 'epuise') {
        try {
          const { getIO } = require('../services/socketService');
          const io = getIO();
          if (io) {
            io.emit('stock:ended', {
              stockId: stockDoc._id,
              code: stockDoc.code,
              variete: stockDoc.variete,
              quantiteInitiale: stockDoc.quantiteInitiale,
              quantiteUtilisee: stockDoc.quantiteInitiale,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (e) {
          // Socket notification is non-critical
        }
      }
    }
  }

  // Auto-resolve and attach ProductionRule to the new semis
  await semisService.resolveAndAttachRuleToSemis(semis, dateSemis);

  const populated = await Semis.findById(semis._id)
    .populate('variete', 'nom')
    .populate('pepiniere', 'nom')
    .populate('productionRuleRef');
  sendCreated(res, populated, 'Semis créé avec succès');
});

/**
 * Allowed fields for semis update — prevents overwriting internal fields.
 */
const ALLOWED_SEMIS_UPDATE_FIELDS = ['statut', 'quantite', 'variete', 'pepiniere', 'type', 'motif'];

/** PUT /api/semis/:id — update a semis entry */
exports.updateSemis = asyncHandler(async (req, res) => {
  const updates = {};
  for (const field of ALLOWED_SEMIS_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  // Prevent reducing quantite below what is already used
  if (updates.quantite !== undefined) {
    const current = await Semis.findById(req.params.id).select('quantite quantiteUtilisee');
    if (!current) throw new AppError('Semis non trouvé', 404);
    if (updates.quantite < (current.quantiteUtilisee || 0)) {
      throw new AppError(
        `Impossible de réduire la quantité à ${updates.quantite} : ${current.quantiteUtilisee} graines sont déjà utilisées par des lots`,
        400
      );
    }
  }

  const semis = await Semis.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true }
  ).populate('variete', 'nom').populate('pepiniere', 'nom');

  if (!semis) throw new AppError('Semis non trouvé', 404);

  activityLogger.log({
    action: 'update', entityType: 'semis',
    entityId: semis._id, entityCode: semis.code,
    details: `Semis ${semis.code} mis à jour : ${Object.keys(updates).join(', ')}`,
    userId: req.user._id,
  });

  sendSuccess(res, semis, 'Semis mis à jour');
});

/** GET /api/semis/external-stats — statistics for external sorties */
exports.getExternalStats = asyncHandler(async (req, res) => {
  const stats = await semisService.computeExternalStats(req.user);
  sendSuccess(res, stats, 'Statistiques des sorties externes');
});

/** POST /api/semis/:id/transfer — transfer semis stock to another pepiniere */
exports.transferSemis = asyncHandler(async (req, res) => {
  const { destinationPepiniere, quantite } = req.body;

  if (!destinationPepiniere) {
    throw new AppError('La pépinière de destination est requise', 400);
  }
  if (!quantite || quantite <= 0) {
    throw new AppError('La quantité doit être supérieure à 0', 400);
  }

  const sourceSemis = await Semis.findById(req.params.id)
    .populate('variete', 'nom')
    .populate('pepiniere', 'nom');

  if (!sourceSemis) throw new AppError('Semis non trouvé', 404);
  if (!sourceSemis.pepiniere) {
    throw new AppError('Ce semis n\'est pas lié à une pépinière et ne peut pas être transféré', 400);
  }
  if (sourceSemis.pepiniere._id.toString() === destinationPepiniere) {
    throw new AppError('La pépinière de destination est identique à la source', 400);
  }

  // Check ingenieur access
  await semisService.checkIngenieurAccess(req.user, sourceSemis.pepiniere._id);

  // Calculate available quantity
  const disponible = sourceSemis.quantite - (sourceSemis.quantiteUtilisee || 0);
  if (quantite > disponible) {
    throw new AppError(
      `Quantité insuffisante. Disponible: ${disponible}, demandé: ${quantite}`,
      400
    );
  }

  const Pepiniere = require('../models/Pepiniere');
  const destPepiniere = await Pepiniere.findById(destinationPepiniere);
  if (!destPepiniere) throw new AppError('Pépinière de destination non trouvée', 404);

  // 1. Decrease source semis quantity
  sourceSemis.quantite -= quantite;
  await sourceSemis.save();

  // 2. Create new semis at destination with same variete
  const semisCode = await generateCode(Semis, 'S');
  const destinationSemis = await Semis.create({
    code: semisCode,
    variete: sourceSemis.variete._id,
    pepiniere: destinationPepiniere,
    type: 'pepiniere',
    quantite: quantite,
    statut: 'prevue',
    tauxGermination: sourceSemis.tauxGermination,
    createdBy: req.user._id,
  });

  // 3. Auto-resolve and attach ProductionRule
  await semisService.resolveAndAttachRuleToSemis(destinationSemis);

  // 4. Activity log
  activityLogger.log({
    action: 'transfer', entityType: 'semis',
    entityId: sourceSemis._id, entityCode: sourceSemis.code,
    details: `Transfert de ${quantite} graines du semis ${sourceSemis.code} (${sourceSemis.pepiniere?.nom}) vers ${destPepiniere.nom} — Nouveau semis: ${destinationSemis.code}`,
    userId: req.user._id,
  });

  // 5. Real-time notification via Socket.IO
  try {
    const { getIO } = require('../services/socketService');
    const io = getIO();
    if (io) {
      io.emit('semis:transferred', {
        sourceSemisId: sourceSemis._id,
        sourceSemisCode: sourceSemis.code,
        sourcePepiniere: { nom: sourceSemis.pepiniere?.nom },
        destinationSemisId: destinationSemis._id,
        destinationSemisCode: destinationSemis.code,
        destinationPepiniere: { _id: destPepiniere._id, nom: destPepiniere.nom },
        variete: { nom: sourceSemis.variete?.nom },
        quantite: quantite,
        timestamp: new Date().toISOString(),
        transferredBy: req.user?.nom || 'Système',
      });
      console.log(`[Socket.IO] Emitted semis:transferred — ${quantite} graines de ${sourceSemis.code} → ${destinationSemis.code} (${destPepiniere.nom})`);
    }
  } catch (e) {
    // Socket notification is non-critical
  }

  const populated = await Semis.findById(destinationSemis._id)
    .populate('variete', 'nom')
    .populate('pepiniere', 'nom')
    .populate('productionRuleRef');

  sendCreated(res, {
    sourceSemis: {
      _id: sourceSemis._id,
      code: sourceSemis.code,
      quantite: sourceSemis.quantite,
      quantiteUtilisee: sourceSemis.quantiteUtilisee,
    },
    destinationSemis: populated,
  }, 'Transfert effectué avec succès');
});

/** GET /api/semis/supervision — semis anomalies & supervision data */
exports.getSemisSupervision = asyncHandler(async (req, res) => {
  const data = await semisService.computeSemisAnomalies(req.user);
  sendSuccess(res, data, 'Données de supervision');
});

/** DELETE /api/semis/:id — delete a semis entry */
exports.deleteSemis = asyncHandler(async (req, res) => {
  const semis = await Semis.findByIdAndDelete(req.params.id);
  if (!semis) throw new AppError('Semis non trouvé', 404);

  activityLogger.log({
    action: 'delete', entityType: 'semis',
    entityId: semis._id, entityCode: semis.code,
    details: `Semis ${semis.code} supprimé (${semis.quantite} graines)`,
    userId: req.user._id,
  });

  sendMessage(res, 'Semis supprimé');
});
