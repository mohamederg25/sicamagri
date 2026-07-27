const Fournisseur = require('../models/Fournisseur');
const { generateCode } = require('../utils/codeGenerator');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendMessage, AppError } = require('../utils/response');
const cache = require('../utils/cache');
const activityLogger = require('../services/activityLogger');

/** GET /api/fournisseurs — list all suppliers */
exports.getFournisseurs = asyncHandler(async (req, res) => {
  const cached = cache.get('fournisseurs:all');
  if (cached) return sendSuccess(res, cached, 'Liste des fournisseurs');

  const fournisseurs = await Fournisseur.find().sort({ nom: 1 }).lean();
  cache.set('fournisseurs:all', fournisseurs, 30000);
  sendSuccess(res, fournisseurs, 'Liste des fournisseurs');
});

/** GET /api/fournisseurs/actif — list only active suppliers */
exports.getActiveFournisseurs = asyncHandler(async (req, res) => {
  const cached = cache.get('fournisseurs:active');
  if (cached) return sendSuccess(res, cached, 'Fournisseurs actifs');

  const fournisseurs = await Fournisseur.find({ statut: 'actif' }).sort({ nom: 1 }).lean();
  cache.set('fournisseurs:active', fournisseurs, 30000);
  sendSuccess(res, fournisseurs, 'Fournisseurs actifs');
});

/** POST /api/fournisseurs — create a new supplier with auto-generated code */
exports.createFournisseur = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  
  // Validation: at least email or telephone required
  if (!data.email && !data.telephone) {
    throw new AppError('Vous devez fournir au moins un email ou un téléphone', 400);
  }

  data.code = await generateCode(Fournisseur, 'F');
  const fournisseur = await Fournisseur.create(data);
  cache.delPrefix('fournisseurs');

  activityLogger.log({
    action: 'create', entityType: 'fournisseur',
    entityId: fournisseur._id, entityCode: fournisseur.code,
    details: `Fournisseur ${fournisseur.nom} créé`,
    userId: req.user._id,
  });

  sendCreated(res, fournisseur, 'Fournisseur créé avec succès');
});

/** PUT /api/fournisseurs/:id — update a supplier */
exports.updateFournisseur = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  const fournisseur = await Fournisseur.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!fournisseur) throw new AppError('Fournisseur non trouvé', 404);
  cache.delPrefix('fournisseurs');

  activityLogger.log({
    action: 'update', entityType: 'fournisseur',
    entityId: fournisseur._id, entityCode: fournisseur.code,
    details: `Fournisseur ${fournisseur.nom} mis à jour`,
    userId: req.user._id,
  });

  sendSuccess(res, fournisseur, 'Fournisseur mis à jour');
});

/** DELETE /api/fournisseurs/:id — delete a supplier */
exports.deleteFournisseur = asyncHandler(async (req, res) => {
  const fournisseur = await Fournisseur.findByIdAndDelete(req.params.id);
  if (!fournisseur) throw new AppError('Fournisseur non trouvé', 404);
  cache.delPrefix('fournisseurs');

  activityLogger.log({
    action: 'delete', entityType: 'fournisseur',
    entityId: fournisseur._id, entityCode: fournisseur.code,
    details: `Fournisseur ${fournisseur.nom} supprimé`,
    userId: req.user._id,
  });

  sendMessage(res, 'Fournisseur supprimé');
});
