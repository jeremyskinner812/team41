import { AUTH_COOKIE, verifyAuthToken } from '../utils/jwt.js';
import { forbidden, unauthenticated } from '../utils/errors.js';

export function requireAuth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return next(unauthenticated());
  try {
    req.user = verifyAuthToken(token);
    return next();
  } catch {
    return next(unauthenticated('Session is invalid or has expired; please log in again'));
  }
}

// Use after requireAuth.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthenticated());
    if (!roles.includes(req.user.role)) return next(forbidden());
    return next();
  };
}
