/**
 * Error Handler — Centralized Error Middleware
 * ==============================================
 *
 * Must be registered LAST in the Express middleware chain (after all routes).
 * Catches:
 *   1. AppError instances (intentional operational errors)
 *   2. Mongoose validation errors (ValidationError)
 *   3. Mongoose duplicate key errors (code 11000)
 *   4. Mongoose cast errors (invalid ObjectId)
 *   5. Unhandled errors (500)
 *
 * In development, the stack trace is included in the response.
 * In production, it is omitted for security.
 */

const { AppError } = require('../utils/response');

//  Mongoose error to AppError converters 

const handleCastError = (err) => {
  const field = err.errors ? (Object.values(err.errors)?.[0]?.path || err.path) : (err.path || 'id');
  return new AppError(`Format invalide pour ${field}`, 400);
};

const handleValidationError = (err) => {
  const messages = Object.values(err.errors)
    .map((e) => e.message)
    .join('. ');
  return new AppError(messages, 400);
};

const handleDuplicateKey = (err) => {
  const field = Object.keys(err.keyPattern || {})[0] || 'champ';
  return new AppError(`Un enregistrement avec ce ${field} existe déjà`, 409);
};

//  Main error handler 

const errorHandler = (err, req, res, next) => {
  // Log every error in development
  if (process.env.NODE_ENV === 'development') {
    console.error(' Error:', err);
  }

  let error = { ...err, message: err.message, stack: err.stack };

  // Convert Mongoose errors to AppError
  if (err.name === 'CastError') error = handleCastError(err);
  if (err.name === 'ValidationError') error = handleValidationError(err);
  if (err.code === 11000) error = handleDuplicateKey(err);

  // Use status code from AppError or default to 500
  const statusCode = error.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';

  const body = {
    message: error.message || 'Erreur interne du serveur',
  };

  // Include stack trace only in development
  if (isDev) {
    body.stack = error.stack;
  }

  res.status(statusCode).json(body);
};

module.exports = errorHandler;
