/**
 * Role Filter — Reusable Query Scope Helpers
 * ============================================
 *
 * Extracts the duplicated 'ingenieur' role filtering pattern.
 * Ingenieurs should only see data from pepinieres they are assigned to.
 *
 * Usage in controllers:
 *   const { getPepiniereIdsForUser, scopeQueryByRole } = require('../utils/roleFilter');
 *
 *   // Simple: get pepiniere IDs for the current user
 *   const pepIds = await getPepiniereIdsForUser(req.user);
 *
 *   // Scoped: add pepiniere filter to existing query
 *   const query = {};
 *   await scopeQueryByRole(req.user, query, 'pepiniere');
 *   const lots = await Lot.find(query);
 */

const Pepiniere = require('../models/Pepiniere');

/**
 * Get the list of pepiniere ObjectIds that a user is allowed to see.
 * - Admin, employe, visiteur: returns null (no restriction — see all)
 * - Ingenieur: returns their assigned pepiniere IDs
 *
 * Returns null when there's no restriction (faster query: no $in needed).
 */
const getPepiniereIdsForUser = async (user) => {
  if (!user || user.role !== 'ingenieur') return null;

  const peps = await Pepiniere.find(
    { ingenieur: user._id },
    '_id'  // Only fetch IDs — faster
  ).lean();

  return peps.length > 0 ? peps.map((p) => p._id) : [];
};

/**
 * Mutates `query` to add a pepiniere filter scope.
 * If pepIds is null/empty for non-ingenieur, no filter is added.
 * If pepIds is an empty array for ingenieur with no pepinieres,
 * sets impossible filter (returns no results).
 *
 * @param {Object} user - req.user object
 * @param {Object} query - MongoDB query object (mutated in-place)
 * @param {string} fieldPath - Field name for pepiniere ref (default 'pepiniere')
 */
const scopeQueryByRole = async (user, query, fieldPath = 'pepiniere') => {
  const pepIds = await getPepiniereIdsForUser(user);

  if (pepIds !== null) {
    // Ingenieur: scope to assigned pepinieres
    // Empty array → no results (impossible filter)
    query[fieldPath] = { $in: pepIds.length > 0 ? pepIds : ['__none__'] };
  }
  // Other roles: no filter needed, query unchanged
};

/**
 * Similar to scopeQueryByRole but returns the scope without mutation.
 * Useful for passing to multiple separate queries.
 */
const getPepiniereScope = async (user) => {
  const pepIds = await getPepiniereIdsForUser(user);
  if (pepIds === null) return {};
  return { pepiniere: { $in: pepIds.length > 0 ? pepIds : ['__none__'] } };
};

module.exports = { getPepiniereIdsForUser, scopeQueryByRole, getPepiniereScope };
