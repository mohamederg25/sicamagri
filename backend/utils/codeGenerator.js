/**
 * Auto Code Generator
 * ====================
 *
 * Generates sequential entity codes in format: <1-letter-prefix><4-digit-number>
 * Examples: P0001, V0042, R0123, C0001, S0001
 *
 * How it works:
 * 1. Queries the model for the document with the highest code value
 * 2. If filter is provided (e.g. { type: 'production' }),
 *    the counter is scoped to that subset
 * 3. Parses the numeric suffix and increments by 1
 * 4. Pads to 4 digits with leading zeros
 *
 * Prefix conventions:
 *   P → Pépinières
 *   V → Variétés
 *   R → Lots (Type: production)
 *   S → Semis
 *   C → Cycles de Semis
 *
 * @param {Model} model  - Mongoose model (e.g., Pepiniere, Lot)
 * @param {string} prefix - Code prefix (e.g., 'T', 'R')
 * @param {Object} [filter={}] - Optional query filter for scoped counters
 * @returns {Promise<string>} - Generated code (e.g., 'R0008')
 */
const generateCode = async (model, prefix, filter = {}) => {
  // Find the document with the highest (lexicographically sorted) code
  const last = await model.findOne(filter).sort({ code: -1 });
  let nextNum = 1;
  if (last && last.code) {
    const match = last.code.match(/\d+$/);   // Extract trailing digits
    if (match) nextNum = parseInt(match[0], 10) + 1;
  }
  return prefix + String(nextNum).padStart(4, '0');
};

module.exports = { generateCode };
