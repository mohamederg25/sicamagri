/**
 * Response Helpers — Standardized API Responses
 * ===============================================
 *
 * Ensures all API responses follow the same format.
 *
 * Success format:
 *   { data: { ... }, message: "..." }
 *
 * Error format (used by errorHandler middleware):
 *   { message: "Description", stack: "..." (development only) }
 *
 * Usage in controllers:
 *   sendSuccess(res, data, "Créé avec succès", 201)
 *   sendError(res, "Not found", 404)  // or throw new AppError()
 */

/**
 * Send a success response (default 200).
 *  Sends data DIRECTLY (not wrapped) to maintain backward compatibility
 *    with the existing frontend which expects `response.data` to be the
 *    actual array or object (e.g. `client.get('/pepinieres')` → data = [...]).
 *
 * The `message` parameter is included only for endpoints that previously
 * returned a message (e.g., deletes).
 */
const sendSuccess = (res, data = null, message = 'Succès', statusCode = 200) => {
  // For backward compatibility: if data is an array or object, send it directly
  // as the response body (same as the original res.json(data)).
  if (data !== null && typeof data === 'object') {
    return res.status(statusCode).json(data);
  }
  // For simple messages (e.g., deletes), send { message }
  return res.status(statusCode).json({ message });
};

/**
 * Send a simple message response (no data body).
 */
const sendMessage = (res, message, statusCode = 200) => {
  return res.status(statusCode).json({ message });
};

/**
 * Send a 201 created response.
 */
const sendCreated = (res, data, message = 'Créé avec succès') => {
  return res.status(201).json(data);
};

/**
 * AppError class — Custom error with HTTP status code.
 * Throw this from services/controllers and errorHandler will catch it.
 *
 * Usage:
 *   throw new AppError('Not found', 404);
 *   throw new AppError('Validation error', 400);
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { sendSuccess, sendMessage, sendCreated, AppError };
