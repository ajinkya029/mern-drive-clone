import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { if (localStorage.getItem('drive_token')) api.get('/auth/me').then(r => setUser(r.data.user)).catch(() => localStorage.removeItem('drive_token')).finally(() => setLoading(false)); else setLoading(false); }, []);
  const login = async (path, values) => { const { data } = await api.post(`/auth/${path}`, values); localStorage.setItem('drive_token', data.token); setUser(data.user); };
  const logout = () => { localStorage.removeItem('drive_token'); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
