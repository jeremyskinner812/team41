import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const AUTH_COOKIE = 'ez_token';
const TOKEN_TTL_SECONDS = 8 * 60 * 60;

export function signAuthToken(user) {
  return jwt.sign({ sub: String(user.userId), role: user.role }, env.jwtSecret, {
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

export function verifyAuthToken(token) {
  const payload = jwt.verify(token, env.jwtSecret);
  return { userId: Number(payload.sub), role: payload.role };
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    // Client (:5173) and API (:4000) are the same site on localhost, so Lax still sends the cookie.
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: '/',
  };
}
