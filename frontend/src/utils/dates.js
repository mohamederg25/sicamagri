/**
 * Date Utility Functions
 * =======================
 *
 * Shared date formatting and calculation helpers.
 * Eliminates duplication across pages.
 */

/**
 * Find the first matching production rule for a given date + varieteId.
 * Tries variete-specific rules first, then falls back to global rules.
 *
 * @param {Array} rules - Production rules array
 * @param {Date|string} date - Date to check
 * @param {string} [varieteId] - Optional variete ID for exact match
 * @returns {object|null} Matching rule or null
 */
export const findMatchingRule = (rules, date, varieteId) => {
  if (varieteId) {
    const exact = rules.find(
      (r) => r.variete?._id === varieteId && isDateInRange(date, r.startDate, r.endDate) && r.isActive
    );
    if (exact) return exact;
  }
  const global = rules.find(
    (r) => !r.variete && isDateInRange(date, r.startDate, r.endDate) && r.isActive
  );
  if (global) return global;
  return null;
};

/**
 * Format a date to French locale (short format).
 * @param {Date|string} d - Date or ISO string
 * @returns {string} e.g., "15 mars 2026"
 */
export const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

/**
 * Format a date to French locale (short, no year).
 * @param {Date|string} d
 * @returns {string} e.g., "15 mars"
 */
export const fmtDateShort = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short',
  });
};

/**
 * Format a number with French locale separators.
 * @param {number|null|undefined} n
 * @returns {string} e.g., "1 234"
 */
export const fmtNumber = (n) => {
  if (n == null) return '—';
  try {
    return n.toLocaleString('fr-FR');
  } catch {
    return String(n);
  }
};

/**
 * Convert a Date or ISO string to YYYY-MM-DD for input[type=date].
 * @param {Date|string} date
 * @returns {string}
 */
export const toInputDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Check if a date falls within a (startDate, endDate) range.
 * Supports cross-year ranges (e.g., Oct 1 → Feb 28).
 * Normalizes to the rule's year so rules are reusable across years.
 *
 * @param {Date|string} date - The date to test
 * @param {Date|string} startDate - Period start
 * @param {Date|string} endDate - Period end
 * @returns {boolean}
 */
export const isDateInRange = (date, startDate, endDate) => {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);

  const ruleYear = start.getFullYear();
  const normalized = new Date(d);
  normalized.setFullYear(ruleYear);

  if (start <= end) {
    return normalized >= start && normalized <= end;
  }
  return normalized >= start || normalized <= end;
};

/**
 * Calculate the number of days between two dates.
 * @param {Date|string} a - Start date
 * @param {Date|string} b - End date
 * @returns {number}
 */
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

/**
 * Get today's date as YYYY-MM-DD string.
 * @returns {string}
 */
export const todayStr = () => new Date().toISOString().split('T')[0];
