import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { errorMessage } from '../api/client.js';
import { authApi } from '../api/index.js';
import { AuthContext } from './contexts.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  // Set when the session check couldn't reach the API, as opposed to "not logged in" (401).
  const [sessionError, setSessionError] = useState(null);

  const checkSession = useCallback(async () => {
    setChecking(true);
    setSessionError(null);
    try {
      const { user: current } = await authApi.me();
      setUser(current);
    } catch (err) {
      setUser(null);
      if (err?.response?.status !== 401) setSessionError(errorMessage(err));
    } finally {
      setChecking(false);
    }
  }, []);

  // Restore the session from the httpOnly cookie on first load.
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // A 401 from any call means the session expired; dropping the user sends them to /login.
  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err?.response?.status === 401) setUser(null);
        return Promise.reject(err);
      },
    );
    return () => api.interceptors.response.eject(id);
  }, []);

  const login = useCallback(async (username, password) => {
    const { user: loggedIn } = await authApi.login(username, password);
    setSessionError(null);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const register = useCallback(async (payload) => {
    const { user: created } = await authApi.register(payload);
    setSessionError(null);
    setUser(created);
    return created;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, checking, sessionError, checkSession, login, register, logout }),
    [user, checking, sessionError, checkSession, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
