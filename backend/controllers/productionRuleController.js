const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendMessage } = require('../utils/response');
const productionRuleService = require('../services/productionRuleService');
const activityLogger = require('../services/activityLogger');

/** GET /api/cycles-de-semis — list all rules */
exports.getRules = asyncHandler(async (req, res) => {
  const filters = {};
  if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === 'true';
  if (req.query.variete) filters.variete = req.query.variete;

  const rules = await productionRuleService.getAllRules(filters);
  sendSuccess(res, rules, 'Liste des cycles de semis');
});

/** GET /api/cycles-de-semis/:id — get a single rule */
exports.getRuleById = asyncHandler(async (req, res) => {
  const rule = await productionRuleService.getRuleById(req.params.id);
  sendSuccess(res, rule);
});

/** POST /api/cycles-de-semis — create a new rule */
exports.createRule = asyncHandler(async (req, res) => {
  const rule = await productionRuleService.createRule(req.body);
  const populated = await productionRuleService.getRuleById(rule._id);

  activityLogger.log({
    action: 'create', entityType: 'production_rule',
    entityId: rule._id, entityCode: populated.nom || rule._id.toString(),
    details: `Cycle de semis ${populated.nom || ''} créé pour la variété ${populated.variete?.nom || ''}`,
    userId: req.user._id,
  });

  sendCreated(res, populated, 'Cycle de semis créé avec succès');
});

/** PUT /api/cycles-de-semis/:id — update a rule */
exports.updateRule = asyncHandler(async (req, res) => {
  const rule = await productionRuleService.updateRule(req.params.id, req.body);

  activityLogger.log({
    action: 'update', entityType: 'production_rule',
    entityId: rule._id, entityCode: rule.nom || rule._id.toString(),
    details: `Cycle de semis ${rule.nom || ''} mis à jour`,
    userId: req.user._id,
  });

  sendSuccess(res, rule, 'Cycle de semis mis à jour');
});

/** DELETE /api/cycles-de-semis/:id — delete a rule */
exports.deleteRule = asyncHandler(async (req, res) => {
  const rule = await productionRuleService.deleteRule(req.params.id);

  activityLogger.log({
    action: 'delete', entityType: 'production_rule',
    entityId: rule._id, entityCode: rule.nom || rule._id.toString(),
    details: `Cycle de semis ${rule.nom || ''} supprimé`,
    userId: req.user._id,
  });

  sendMessage(res, 'Cycle de semis supprimé');
});
