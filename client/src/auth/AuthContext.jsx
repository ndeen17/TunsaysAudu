import { createContext, useContext, useEffect, useState } from 'react';
import { get, post } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out

  async function refresh() {
    try {
      const me = await get('/auth/me');
      setUser(me);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(username, password) {
    const me = await post('/auth/login', { username, password });
    setUser(me);
    return me;
  }

  async function logout() {
    await post('/auth/logout');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
