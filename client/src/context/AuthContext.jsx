import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, refreshAccessToken, setAccessToken } from '../api/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // On load, try silently redeeming the HttpOnly refresh cookie for a fresh access token,
      // rather than persisting anything sensitive in browser storage between page loads.
      const ok = await refreshAccessToken();
      if (ok) {
        try {
          const { user: me } = await authApi.me();
          setUser(me);
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
