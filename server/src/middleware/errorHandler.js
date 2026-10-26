import { AppError, notFound } from '../utils/errors.js';
import env from '../config/env.js';

export function notFoundHandler(req, res, next) {
  next(notFound(`No route for ${req.method} ${req.originalUrl}`));
}

function send(res, status, code, message, details) {
  const error = { code, message };
  if (details) error.details = details;
  return res.status(status).json({ error });
}

// Express recognizes error middleware by its four-argument signature, so `next` must stay.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) return send(res, err.status, err.code, err.message, err.details);

  if (err.type === 'entity.parse.failed') {
    return send(res, 400, 'INVALID_JSON', 'Request body is not valid JSON');
  }

  // Backstop for races the services' own checks can't see (e.g. two simultaneous sign-ups).
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors?.[0]?.path ?? 'value';
    return send(res, 409, 'DUPLICATE', `${field} already exists`);
  }

  if (err.name === 'SequelizeValidationError') {
    return send(res, 400, 'VALIDATION_ERROR', err.errors.map((e) => e.message).join('; '));
  }

  console.error(err);
  const message = env.nodeEnv === 'production' ? 'Internal server error' : err.message;
  return send(res, 500, 'INTERNAL_ERROR', message);
}
