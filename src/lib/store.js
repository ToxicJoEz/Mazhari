import { useEffect, useState, useCallback } from 'react';
import { apiRequest } from './api';
export const money = (value) =>
  new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
export const label = (value) =>
  (value || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const date = (value) =>
  value ? new Date(value).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '';
export const productImage = (p) => p?.images?.[0] || p?.image || '/images/product.svg';
export const userId = (u) => u?.id || u?._id || '';
export function useResource(path, token, enabled = true) {
  const [state, setState] = useState({ data: null, error: '', loading: true, key: '' });
  const [revision, setRevision] = useState(0);
  const requestKey = path + '|' + (token || '') + '|' + revision;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    apiRequest(path, { token, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ data, error: '', loading: false, key: requestKey });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ data: null, error: error.message, loading: false, key: requestKey });
      });
    return () => controller.abort();
  }, [path, token, enabled, requestKey]);
  const refresh = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    setRevision((n) => n + 1);
  }, []);
  return {
    ...(state.key === requestKey ? state : { data: null, error: '', loading: true }),
    refresh,
  };
}
