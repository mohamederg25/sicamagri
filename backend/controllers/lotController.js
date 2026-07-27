const Lot = require('../models/Lot');
const Semis = require('../models/Semis');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, AppError } = require('../utils/response');
const { getPepiniereIdsForUser } = require('../utils/roleFilter');
const lotService = require('../services/lotService');

/**
 * Base populate config for fetching lots.
 */
const POPULATE_CONFIG = [
  { path: 'semis', populate: [{ path: 'pepiniere', select: 'nom' }, { path: 'variete', select: 'nom statut' }] },
  { path: 'stockRef', select: 'code variete tauxManuel', populate: { path: 'variete', select: 'nom' } },
  { path: 'lotsProduction' },
  { path: 'events.user', select: 'nom' },
  { path: 'observations.user', select: 'nom' },
];

/** GET /api/lots — list all lots (filtered by role) */
exports.getLots = asyncHandler(async (req, res) => {
  // Auto-transition lots that have reached their ready date
  await lotService.autoMarkReadyLots();

  let query = {};
  if (req.user.role === 'ingenieur') {
    const pepIds = await getPepiniereIdsForUser(req.user);
    if (pepIds !== null) {
      const scopedSemis = await Semis.find({ pepiniere: { $in: pepIds.length > 0 ? pepIds : ['__none__'] } }).select('_id').lean();
      const semisIds = scopedSemis.map(s => s._id);
      query.semis = { $in: semisIds.length > 0 ? semisIds : ['__none__'] };
    }
  }
  const lots = await Lot.find(query).populate(POPULATE_CONFIG);
  sendSuccess(res, lots, 'Liste des lots');
});

/** GET /api/lots/history — get harvested/completed production lots */
exports.getHistory = asyncHandler(async (req, res) => {
  // Auto-transition lots that have reached their ready date
  await lotService.autoMarkReadyLots();
  
  const lots = await lotService.getHistory(req.user);
  sendSuccess(res, lots, 'Historique des récoltes');
});

/** GET /api/lots/:id — get a single lot */
exports.getLotById = asyncHandler(async (req, res) => {
  // Auto-transition lots that have reached their ready date
  await lotService.autoMarkReadyLots();
  
  const lot = await Lot.findById(req.params.id).populate(POPULATE_CONFIG);
  if (!lot) throw new AppError('Lot non trouvé', 404);
  sendSuccess(res, lot);
});

/** POST /api/lots — create a new production lot */
exports.createLot = asyncHandler(async (req, res) => {
  const lotData = await lotService.buildLotData(req.body);
  const lot = await Lot.create(lotData);
  const populated = await Lot.findById(lot._id)
    .populate({ path: 'semis', populate: [{ path: 'pepiniere', select: 'nom' }, { path: 'variete', select: 'nom statut' }] });
  
  sendCreated(res, populated, 'Lot créé avec succès');
});

/** PUT /api/lots/:id/mark-ready — mark a production lot as ready for harvest */
exports.markReady = asyncHandler(async (req, res) => {
  const lot = await lotService.markReady(
    req.params.id,
    req.user._id
  );
  sendSuccess(res, lot, 'Lot marqué prêt pour la récolte');
});

/** PUT /api/lots/:id/mark-harvest — mark a production lot as harvested */
exports.markHarvest = asyncHandler(async (req, res) => {
  const lot = await lotService.markHarvest(
    req.params.id,
    req.user._id,
    req.body.nombrePlantsProduits
  );
  sendSuccess(res, lot, 'Lot marqué comme récolté');
});

/** PUT /api/lots/:id/mark-delivery — mark a harvested lot as delivered */
exports.markDelivery = asyncHandler(async (req, res) => {
  const lot = await lotService.markDelivery(
    req.params.id,
    req.user._id,
    req.body
  );
  sendSuccess(res, lot, 'Lot marqué comme livré');
});

/** PUT /api/lots/:id/add-note — add an observation note to a production lot */
exports.addNote = asyncHandler(async (req, res) => {
  const lot = await lotService.addNote(
    req.params.id,
    req.user._id,
    req.body
  );
  sendSuccess(res, lot, 'Observation ajoutée');
});
