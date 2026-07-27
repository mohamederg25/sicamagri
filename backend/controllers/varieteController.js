const Variete = require('../models/Variete');
const { generateCode } = require('../utils/codeGenerator');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendMessage, AppError } = require('../utils/response');
const cache = require('../utils/cache');
const activityLogger = require('../services/activityLogger');

/** GET /api/varietes — list all varieties */
exports.getVarietes = asyncHandler(async (req, res) => {
  const cached = cache.get('varietes:all');
  if (cached) return sendSuccess(res, cached, 'Liste des variétés');

  const varietes = await Variete.find().lean();
  cache.set('varietes:all', varietes, 30000);
  sendSuccess(res, varietes, 'Liste des variétés');
});

/** GET /api/varietes/active — list only active varieties */
exports.getActiveVarietes = asyncHandler(async (req, res) => {
  const cached = cache.get('varietes:active');
  if (cached) return sendSuccess(res, cached, 'Variétés actives');

  const varietes = await Variete.find({ statut: 'active' }).lean();
  cache.set('varietes:active', varietes, 30000);
  sendSuccess(res, varietes, 'Variétés actives');
});

/** POST /api/varietes — create a new variety with auto-generated code */
exports.createVariete = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.user && req.user.role !== 'admin') {
    delete data.statut;
  }
  data.code = await generateCode(Variete, 'V');
  const variete = await Variete.create(data);
  cache.delPrefix('varietes');

  activityLogger.log({
    action: 'create', entityType: 'variete',
    entityId: variete._id, entityCode: variete.code,
    details: `Variété ${variete.nom || variete.code} créée`,
    userId: req.user._id,
  });

  sendCreated(res, variete, 'Variété créée avec succès');
});

/** PUT /api/varietes/:id — update a variety */
exports.updateVariete = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.user && req.user.role !== 'admin') {
    delete data.statut;
  }
  const variete = await Variete.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!variete) throw new AppError('Variété non trouvée', 404);
  cache.delPrefix('varietes');

  activityLogger.log({
    action: 'update', entityType: 'variete',
    entityId: variete._id, entityCode: variete.code,
    details: `Variété ${variete.nom || variete.code} mise à jour`,
    userId: req.user._id,
  });

  sendSuccess(res, variete, 'Variété mise à jour');
});

/** DELETE /api/varietes/:id — delete a variety */
exports.deleteVariete = asyncHandler(async (req, res) => {
  const variete = await Variete.findByIdAndDelete(req.params.id);
  if (!variete) throw new AppError('Variété non trouvée', 404);
  cache.delPrefix('varietes');

  activityLogger.log({
    action: 'delete', entityType: 'variete',
    entityId: variete._id, entityCode: variete.code,
    details: `Variété ${variete.nom || variete.code} supprimée`,
    userId: req.user._id,
  });

  sendMessage(res, 'Variété supprimée');
});
