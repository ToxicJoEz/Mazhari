import { useEffect, useState, useCallback } from 'react';
import { NotificationsContext } from './notifications';
import { useAuth } from './auth';
import { apiRequest } from '../lib/api';
export default function NotificationsProvider({ children }) {
  const { user, token } = useAuth();
  const [state, setState] = useState({ data: null, error: '' }),
    [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const enabled = ['admin', 'moderator'].includes(user?.role);
  useEffect(() => {
    if (!enabled || !token) return;
    const controller = new AbortController();
    apiRequest('/admin/order-notifications', { token, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, error: '' });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState((previous) => ({ ...previous, error: error.message }));
      });
    return () => controller.abort();
  }, [enabled, token, revision]);
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (document.visibilityState !== 'hidden') refresh();
    };
    const timer = setInterval(tick, 30000);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tick);
    };
  }, [enabled, refresh]);
  return (
    <NotificationsContext.Provider value={{ ...state, enabled, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
}
