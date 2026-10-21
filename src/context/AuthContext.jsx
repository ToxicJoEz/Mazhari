import { useEffect, useState } from 'react';
import { AuthContext } from './auth';
import { apiRequest } from '../lib/api';

const storageKey = 'mazhari-session';
const readToken = () => { try { return sessionStorage.getItem(storageKey) || ''; } catch { return ''; } };

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const logout = () => {
    try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
    setToken(''); setUser(null); setError(''); setLoading(false);
  };

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    apiRequest('/users/profile', { token, signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setUser(data.user); })
      .catch(err => {
        if (controller.signal.aborted) return;
        setUser(null);
        if (err.status === 401 || err.status === 403) logout();
        else setError(err.message);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, retry]);

  const authenticate = async (mode, fields) => {
    const data = await apiRequest('/auth/' + mode, { method: 'POST', body: JSON.stringify(fields) });
    try { sessionStorage.setItem(storageKey, data.token); } catch { /* Keep this session in memory. */ }
    setError(''); setUser(data.user); setLoading(true); setToken(data.token);
  };

  return <AuthContext.Provider value={{ user, token, loading, error, authenticate, logout, retryProfile: () => { setLoading(true); setError(''); setRetry(value => value + 1); } }}>{children}</AuthContext.Provider>;
}
