/**
 * Pepiniere Service — Nursery Business Logic
 * ============================================
 *
 * Handles role-based filtering and CRUD operations for pepinieres.
 * The controller handles req/res; this service handles data access.
 *
 * Each pepiniere has at most ONE ingenieur assigned.
 */

const Pepiniere = require('../models/Pepiniere');
const { generateCode } = require('../utils/codeGenerator');
const { getPepiniereIdsForUser } = require('../utils/roleFilter');
const { AppError } = require('../utils/response');

/**
 * Allowed fields for create/update operations.
 * Prevents setting internal fields like _id, code, or ingenieur directly.
 */
const ALLOWED_FIELDS = ['nom', 'address', 'number', 'email', 'statut'];

/**
 * Sanitize pepiniere input — only allow whitelisted fields.
 */
const sanitizeInput = (body) => {
  const sanitized = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) {
      sanitized[field] = body[field];
    }
  }
  return sanitized;
};

/**
 * Get all pepinieres, filtered by user role.
 * - Admin/employe/visiteur: all pepinieres
 * - Ingenieur: only the pepiniere they are assigned to
 */
const getAll = async (user, onlyActive = false) => {
  let query = {};
  if (onlyActive) query.statut = 'actif';

  if (user && user.role === 'ingenieur') {
    query.ingenieur = user._id;
  }

  return Pepiniere.find(query).populate('ingenieur', 'nom email').lean();
};

/**
 * Create a new pepiniere with auto-generated code.
 */
const create = async (data) => {
  const code = await generateCode(Pepiniere, 'P');
  const sanitized = sanitizeInput(data);
  return Pepiniere.create({ ...sanitized, code });
};

/**
 * Update a pepiniere by ID. Only allows whitelisted fields.
 */
const update = async (id, data) => {
  const sanitized = sanitizeInput(data);
  if (Object.keys(sanitized).length === 0) {
    throw new AppError('Aucun champ valide à mettre à jour', 400);
  }

  const pepiniere = await Pepiniere.findByIdAndUpdate(id, sanitized, {
    new: true,
    runValidators: true,
  });

  if (!pepiniere) throw new AppError('Pépinière non trouvée', 404);
  return pepiniere;
};

/**
 * Delete a pepiniere by ID.
 */
const remove = async (id) => {
  const pepiniere = await Pepiniere.findByIdAndDelete(id);
  if (!pepiniere) throw new AppError('Pépinière non trouvée', 404);
  return pepiniere;
};

/**
 * Assign an ingenieur to a pepiniere (replaces any existing ingenieur).
 */
const assignIngenieur = async (pepiniereId, userId) => {
  const pepiniere = await Pepiniere.findById(pepiniereId);
  if (!pepiniere) throw new AppError('Pépinière non trouvée', 404);

  pepiniere.ingenieur = userId;
  await pepiniere.save();

  return pepiniere.populate('ingenieur', 'nom email');
};

/**
 * Remove the ingenieur from a pepiniere (unassign).
 */
const removeIngenieur = async (pepiniereId, userId) => {
  const pepiniere = await Pepiniere.findById(pepiniereId);
  if (!pepiniere) throw new AppError('Pépinière non trouvée', 404);

  // Only remove if this user is the current ingenieur
  if (pepiniere.ingenieur && pepiniere.ingenieur.toString() === userId) {
    pepiniere.ingenieur = null;
    await pepiniere.save();
  }

  return pepiniere.populate('ingenieur', 'nom email');
};

module.exports = { getAll, create, update, remove, assignIngenieur, removeIngenieur };
