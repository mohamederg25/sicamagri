/**
 * Async Handler — Wrap Async Route Handlers
 * ===========================================
 *
 * Eliminates the need for try/catch in every controller.
 * Catches any rejected promise and forwards it to the Express
 * error handling middleware (errorHandler.js).
 *
 * Usage (before):
 *   exports.getItems = async (req, res) => {
 *     try { ... } catch (error) { res.status(500).json(...) }
 *   };
 *
 * Usage (after):
 *   exports.getItems = asyncHandler(async (req, res) => {
 *     ...  // errors are automatically caught
 *   });
 *
 * The errorHandler middleware must be registered AFTER all routes
 * in server.js.
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
