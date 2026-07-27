/**
 * ProductionRule Service — Business Logic for Production Duration Rules
 * ======================================================================
 *
 * Handles:
 *   - CRUD operations for ProductionRule documents
 *   - Rule matching logic: given a date and optional variete, find the
 *     best-matching ProductionRule
 *   - Date calculation: produce expectedReadyDateMin, expectedReadyDateMax,
 *     and maturityWindowEnd from a rule + sowing date
 *
 * Rule matching strategy (priority order):
 *   1. Exact match: rule with matching variete AND date range containing the date
 *   2. Global match: rule with variete = null AND date range containing the date
 *   3. Closest fallback: first active rule ordered by (productionMinDays) — safest
 *
 * Date matching normalizes the year of the sowing date to the rule's reference year
 * so that rules are reusable across years.
 */

const ProductionRule = require('../models/ProductionRule');
const { generateCode } = require('../utils/codeGenerator');
const { AppError } = require('../utils/response');

/**
 * Check if a given date falls within a (startDate, endDate) period.
 * Supports cross-year ranges (e.g., start=2024-10-01, end=2025-02-28).
 * The comparison normalizes the sowing date's year to the rule's year.
 *
 * @param {Date|string} sowingDate - The date to test
 * @param {Date} startDate - Period start
 * @param {Date} endDate - Period end
 * @returns {boolean}
 */
const isDateInRange = (sowingDate, startDate, endDate) => {
  const sow = new Date(sowingDate);
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Normalize: use the rule's year for comparison so rules are reusable
  const ruleYear = start.getFullYear();
  const normalizedSow = new Date(sow);
  normalizedSow.setFullYear(ruleYear);

  if (start <= end) {
    // Same-year range: e.g., Jan 1 → Mar 31
    return normalizedSow >= start && normalizedSow <= end;
  }
  // Cross-year range: e.g., Oct 1 2024 → Feb 28 2025
  return normalizedSow >= start || normalizedSow <= end;
};

/**
 * Find the best-matching ProductionRule for a given sowing date and variete.
 *
 * Strategy:
 *   1. Try exact match (variete + period)
 *   2. Fall back to global match (variete = null + period)
 *   3. Fall back to default rule (first active, ordered by min days)
 *
 * @param {Date|string} sowingDate - The sowing/planting date
 * @param {ObjectId|null} varieteId - Optional variety ID to match
 * @returns {Promise<Object|null>} - The matching rule document (lean), or null
 */
const findMatchingRule = async (sowingDate, varieteId = null) => {
  // Step 1: Try exact match (variete + period)
  if (varieteId) {
    const varieteRules = await ProductionRule.find({
      variete: varieteId,
      isActive: true,
    }).lean();

    const exactMatch = varieteRules.find((r) =>
      isDateInRange(sowingDate, r.startDate, r.endDate)
    );
    if (exactMatch) return exactMatch;
  }

  // Step 2: Try global match (variete = null + period)
  const globalRules = await ProductionRule.find({
    variete: null,
    isActive: true,
  }).lean();

  const globalMatch = globalRules.find((r) =>
    isDateInRange(sowingDate, r.startDate, r.endDate)
  );
  if (globalMatch) return globalMatch;

  // Step 3: Fallback — return the first active rule with the smallest productionMinDays
  // (safest conservative estimate)
  const fallback = await ProductionRule.findOne({ isActive: true })
    .sort({ productionMinDays: 1 })
    .lean();

  return fallback || null;
};

/**
 * Calculate production dates from a ProductionRule and a sowing date.
 *
 * @param {Object} rule - ProductionRule document (must have productionMinDays, productionMaxDays, maturityWindowDays)
 * @param {Date|string} sowingDate - The sowing date
 * @returns {Object} - { expectedReadyDateMin, expectedReadyDateMax, maturityWindowEnd }
 */
const calculateDatesFromRule = (rule, sowingDate) => {
  const date = new Date(sowingDate);

  const expectedReadyDateMin = new Date(date);
  expectedReadyDateMin.setDate(expectedReadyDateMin.getDate() + rule.productionMinDays);

  const expectedReadyDateMax = new Date(date);
  expectedReadyDateMax.setDate(expectedReadyDateMax.getDate() + rule.productionMaxDays);

  // The maturity window is the period between the earliest and latest ready dates.
  // maturityWindowEnd = expectedReadyDateMax (the max ready date is the end of the maturity window).
  const maturityWindowEnd = new Date(expectedReadyDateMax);

  return {
    expectedReadyDateMin,
    expectedReadyDateMax,
    maturityWindowEnd,
  };
};

/**
 * Resolve a ProductionRule for a given sowing date + variete, and compute dates.
 * Returns { rule, dates } or null if no rule found.
 *
 * @param {Date|string} sowingDate
 * @param {ObjectId|null} varieteId
 * @returns {Promise<{rule: Object, dates: Object}|null>}
 */
const resolveRuleAndDates = async (sowingDate, varieteId = null) => {
  const rule = await findMatchingRule(sowingDate, varieteId);
  if (!rule) return null;

  const dates = calculateDatesFromRule(rule, sowingDate);
  return { rule, dates };
};

// ─── CRUD Operations ────────────────────────────────────────────────

/**
 * Get all production rules, with optional filtering.
 */
const getAllRules = async (filters = {}) => {
  const query = {};
  if (filters.isActive !== undefined) query.isActive = filters.isActive;
  if (filters.variete) query.variete = filters.variete;

  return ProductionRule.find(query).lean()
    .populate('variete', 'nom code')
    .sort({ startDate: 1, productionMinDays: 1 });
};

/**
 * Get a single production rule by ID.
 */
const getRuleById = async (id) => {
  const rule = await ProductionRule.findById(id).populate('variete', 'nom code').lean();
  if (!rule) throw new AppError('Cycle de semis non trouvé', 404);
  return rule;
};

/**
 * Validate that maturityWindowDays == productionMaxDays - productionMinDays.
 * Throws AppError with a clear message if the constraint is violated.
 */
const validateMaturityWindow = (data) => {
  const min = data.productionMinDays;
  const max = data.productionMaxDays;
  const window = data.maturityWindowDays;
  const expected = max - min;
  if (window !== expected) {
    throw new AppError(
      `La fenêtre de maturité doit être égale à la différence entre la durée max et la durée min (${max} - ${min} = ${expected} jours). Valeur reçue : ${window} jours`,
      400
    );
  }
};

/**
 * Check if two date ranges overlap using the existing isDateInRange logic.
 * Reuses the cross-year normalization from isDateInRange.
 * Two ranges overlap if any endpoint of one falls within the other.
 */
const rangesOverlap = (startA, endA, startB, endB) =>
  isDateInRange(startA, startB, endB) ||
  isDateInRange(endA, startB, endB) ||
  isDateInRange(startB, startA, endA) ||
  isDateInRange(endB, startA, endA);

/**
 * Validate that the new rule's date range doesn't overlap with existing rules.
 * Throws AppError if overlap detected.
 */
const validateNoOverlap = async (startDate, endDate, excludeId = null) => {
  const query = excludeId ? { _id: { $ne: excludeId } } : {};
  const existingRules = await ProductionRule.find(query).select('sowingPeriodLabel code startDate endDate').lean();

  const newStart = new Date(startDate);
  const newEnd = new Date(endDate);

  const overlappingRules = [];

  for (const rule of existingRules) {
    if (rangesOverlap(newStart, newEnd, rule.startDate, rule.endDate)) {
      overlappingRules.push(rule);
    }
  }

  if (overlappingRules.length > 0) {
    const names = overlappingRules.map(r => `${r.sowingPeriodLabel} (${r.code})`).join(', ');
    throw new AppError(
      `Chevauchement de dates détecté : le cycle chevauche ${names}. Veuillez ajuster les dates pour éviter les périodes qui se superposent.`,
      400
    );
  }

  return true;
};

/**
 * Create a new production rule.
 */
const createRule = async (data) => {
  validateMaturityWindow(data);

  // Check for overlaps before creating
  await validateNoOverlap(data.startDate, data.endDate);

  const code = await generateCode(ProductionRule, 'C');
  return ProductionRule.create({ ...data, code });
};

/**
 * Update an existing production rule.
 */
const updateRule = async (id, data) => {
  // Load existing rule for context-dependent validation
  const existing = await ProductionRule.findById(id).select('productionMinDays productionMaxDays maturityWindowDays startDate endDate').lean();
  if (!existing) throw new AppError('Cycle de semis non trouvé', 404);

  // Merge existing values with update data for validation
  const merged = {
    productionMinDays: data.productionMinDays ?? existing.productionMinDays,
    productionMaxDays: data.productionMaxDays ?? existing.productionMaxDays,
    maturityWindowDays: data.maturityWindowDays,
  };

  // Validate if maturityWindowDays is being explicitly set
  if (merged.maturityWindowDays !== undefined) {
    validateMaturityWindow(merged);
  } else {
    const recalculated = merged.productionMaxDays - merged.productionMinDays;
    if (recalculated !== existing.maturityWindowDays) {
      throw new AppError(
        `La modification des durées (min: ${existing.productionMinDays}→${merged.productionMinDays}, max: ${existing.productionMaxDays}→${merged.productionMaxDays}) rend la fenêtre de maturité obsolète. La fenêtre de maturité doit être égale à ${recalculated} jours (${merged.productionMaxDays} - ${merged.productionMinDays})`,
        400
      );
    }
  }

  // If dates changed, check for overlaps (exclude self)
  if (data.startDate || data.endDate) {
    const mergedStart = data.startDate ? new Date(data.startDate) : existing.startDate;
    const mergedEnd = data.endDate ? new Date(data.endDate) : existing.endDate;
    await validateNoOverlap(mergedStart, mergedEnd, id);
  }

  const rule = await ProductionRule.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate('variete', 'nom code');

  return rule;
};

/**
 * Delete a production rule.
 */
const deleteRule = async (id) => {
  const rule = await ProductionRule.findByIdAndDelete(id);
  if (!rule) throw new AppError('Cycle de semis non trouvé', 404);
  return rule;
};

module.exports = {
  findMatchingRule,
  calculateDatesFromRule,
  resolveRuleAndDates,
  getAllRules,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
};
