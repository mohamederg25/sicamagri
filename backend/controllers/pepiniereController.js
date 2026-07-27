const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendMessage } = require('../utils/response');
const pepiniereService = require('../services/pepiniereService');
const cache = require('../utils/cache');
const activityLogger = require('../services/activityLogger');

/** GET /api/pepinieres — list all pepinieres (filtered by role) */
exports.getPepinieres = asyncHandler(async (req, res) => {
  const cacheKey = `pepinieres:all:${req.user?._id || 'anon'}`;
  const cached = cache.get(cacheKey);
  if (cached) return sendSuccess(res, cached, 'Liste des pépinières');

  const pepinieres = await pepiniereService.getAll(req.user);
  cache.set(cacheKey, pepinieres, 30000);
  sendSuccess(res, pepinieres, 'Liste des pépinières');
});

/** GET /api/pepinieres/active — list only active pepinieres */
exports.getActivePepinieres = asyncHandler(async (req, res) => {
  const cacheKey = `pepinieres:active:${req.user?._id || 'anon'}`;
  const cached = cache.get(cacheKey);
  if (cached) return sendSuccess(res, cached, 'Pépinières actives');

  const pepinieres = await pepiniereService.getAll(req.user, true);
  cache.set(cacheKey, pepinieres, 30000);
  sendSuccess(res, pepinieres, 'Pépinières actives');
});

/** POST /api/pepinieres — create a new pepiniere */
exports.createPepiniere = asyncHandler(async (req, res) => {
  const pepiniere = await pepiniereService.create(req.body);
  cache.delPrefix('pepinieres');

  activityLogger.log({
    action: 'create', entityType: 'pepiniere',
    entityId: pepiniere._id, entityCode: pepiniere.nom,
    details: `Pépinière ${pepiniere.nom} créée`,
    userId: req.user._id,
  });

  sendCreated(res, pepiniere, 'Pépinière créée avec succès');
});

/** PUT /api/pepinieres/:id — update a pepiniere */
exports.updatePepiniere = asyncHandler(async (req, res) => {
  const pepiniere = await pepiniereService.update(req.params.id, req.body);
  cache.delPrefix('pepinieres');

  activityLogger.log({
    action: 'update', entityType: 'pepiniere',
    entityId: pepiniere._id, entityCode: pepiniere.nom,
    details: `Pépinière ${pepiniere.nom} mise à jour`,
    userId: req.user._id,
  });

  sendSuccess(res, pepiniere, 'Pépinière mise à jour');
});

/** DELETE /api/pepinieres/:id — delete a pepiniere */
exports.deletePepiniere = asyncHandler(async (req, res) => {
  const pepiniere = await pepiniereService.remove(req.params.id);
  cache.delPrefix('pepinieres');

  activityLogger.log({
    action: 'delete', entityType: 'pepiniere',
    entityId: pepiniere._id, entityCode: pepiniere.nom,
    details: `Pépinière ${pepiniere.nom} supprimée`,
    userId: req.user._id,
  });

  sendMessage(res, 'Pépinière supprimée');
});

/** PUT /api/pepinieres/:id/assign/:userId — assign an ingenieur to a pepiniere */
exports.assignIngenieur = asyncHandler(async (req, res) => {
  const pepiniere = await pepiniereService.assignIngenieur(req.params.id, req.params.userId);
  cache.delPrefix('pepinieres');

  activityLogger.log({
    action: 'assign', entityType: 'pepiniere',
    entityId: pepiniere._id, entityCode: pepiniere.nom,
    details: `Ingénieur assigné à la pépinière ${pepiniere.nom}`,
    userId: req.user._id,
  });

  sendSuccess(res, pepiniere, 'Ingénieur assigné');
});

/** DELETE /api/pepinieres/:id/assign/:userId — remove the ingenieur from a pepiniere */
exports.removeIngenieur = asyncHandler(async (req, res) => {
  const pepiniere = await pepiniereService.removeIngenieur(req.params.id, req.params.userId);
  cache.delPrefix('pepinieres');

  activityLogger.log({
    action: 'remove_assign', entityType: 'pepiniere',
    entityId: pepiniere._id, entityCode: pepiniere.nom,
    details: `Ingénieur retiré de la pépinière ${pepiniere.nom}`,
    userId: req.user._id,
  });

  sendSuccess(res, pepiniere, 'Ingénieur retiré de la pépinière');
});
