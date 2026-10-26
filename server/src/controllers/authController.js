import * as authService from '../services/authService.js';
import { validated } from '../middleware/validate.js';
import { AUTH_COOKIE, authCookieOptions, signAuthToken } from '../utils/jwt.js';

function setSession(res, user) {
  res.cookie(AUTH_COOKIE, signAuthToken(user), authCookieOptions());
}

export async function register(req, res) {
  const user = await authService.registerCustomer(validated(req));
  setSession(res, user);
  res.status(201).json({ user });
}

export async function login(req, res) {
  const { username, password } = validated(req);
  const user = await authService.authenticate(username, password);
  setSession(res, user);
  res.json({ user });
}

export function logout(req, res) {
  // Express 5 ignores maxAge here; the other options must match for the browser to drop the cookie.
  res.clearCookie(AUTH_COOKIE, authCookieOptions());
  res.json({ success: true });
}

export async function me(req, res) {
  res.json({ user: await authService.getUserById(req.user.userId) });
}
