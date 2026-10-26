/* eslint-disable react/set-state-in-effect -- Synchronize the external guest/cloud bag when the authenticated account changes. */
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useAuth } from './auth';
import { apiRequest } from '../lib/api';
import { userId } from '../lib/store';
import { CartState as Context } from './cart';
const key = 'mazhari-guest-bag-v2';
const newGuest = () => ({ mergeKey: crypto.randomUUID(), items: [] });
function readGuest() {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return Array.isArray(saved?.items) && saved.mergeKey ? saved : newGuest();
  } catch {
    return newGuest();
  }
}
function writeGuest(value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Keep the in-memory bag if storage is disabled. */
  }
}
const shape = (item) => ({
  ...item,
  id: String(item.product?._id || item.product || item.productId || item.id),
  name: item.title || item.name,
  images: [item.image || item.images?.[0] || ''],
});
export function CartProvider({ children }) {
  const { user, token, loading: authLoading } = useAuth();
  const owner = userId(user);
  const [items, setItems] = useState(() => readGuest().items.map(shape));
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(!token);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isDrawerOpen, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const current = useRef(items);
  const rev = useRef(revision);
  const busy = useRef(false);
  const identity = useRef(owner);
  useLayoutEffect(() => {
    current.current = items;
    rev.current = revision;
    identity.current = owner;
  }, [items, revision, owner]);
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const guest = readGuest();
    if (!owner) {
      setItems(guest.items.map(shape));
      setRevision(0);
      setReady(true);
      setError('');
      return;
    }
    setReady(false);
    setError('');
    const load = guest.items.length
      ? apiRequest('/cart/sync', {
          token,
          method: 'POST',
          body: JSON.stringify({
            mergeKey: guest.mergeKey,
            guestItems: guest.items.map((i) => ({
              productId: i.id,
              size: i.size,
              color: i.color,
              quantity: i.quantity,
            })),
          }),
        })
      : apiRequest('/cart', { token });
    load
      .then((data) => {
        if (cancelled) return;
        if (guest.items.length) writeGuest(newGuest());
        setItems(data.cart.items.map(shape));
        setRevision(data.cart.revision);
        setNotice(data.warnings?.join(' ') || '');
        setReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setReady(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [owner, token, authLoading, retry]);
  useEffect(() => {
    if (owner) return;
    const sync = (event) => {
      if (event.key === key) setItems(readGuest().items.map(shape));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [owner]);
  async function change(transform) {
    if (busy.current || !ready) return false;
    busy.current = true;
    setPending(true);
    setError('');
    setNotice('');
    const startedOwner = owner;
    try {
      const next = transform(owner ? current.current : readGuest().items.map(shape));
      if (next.length > 30) throw new Error('Your bag can contain up to 30 selections.');
      if (owner) {
        const data = await apiRequest('/cart', {
          token,
          method: 'PUT',
          body: JSON.stringify({
            revision: rev.current,
            items: next.map((i) => ({
              productId: i.id,
              size: i.size,
              color: i.color,
              quantity: i.quantity,
            })),
          }),
        });
        if (identity.current !== startedOwner) return false;
        setItems(data.cart.items.map(shape));
        setRevision(data.cart.revision);
        setNotice(data.warnings?.join(' ') || '');
      } else {
        const guest = readGuest();
        writeGuest({ ...guest, items: next });
        setItems(next);
      }
      return true;
    } catch (err) {
      setError(err.message);
      if (err.status === 409) setReady(false);
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  const addToCart = async (product, size, color) => {
    const available =
      product.variants.find((v) => v.size === size && v.color === color)?.stock || 0;
    const result = await change((previous) => {
      const existing = previous.find(
        (i) => i.id === product._id && i.size === size && i.color === color,
      );
      if ((existing?.quantity || 0) >= Math.min(available, 50))
        throw new Error('No more stock available for this selection.');
      return existing
        ? previous.map((i) => (i === existing ? { ...i, quantity: i.quantity + 1 } : i))
        : [
            ...previous,
            {
              id: product._id,
              name: product.title,
              title: product.title,
              price: product.basePrice,
              images: product.images,
              image: product.images[0],
              size,
              color,
              quantity: 1,
              availableStock: available,
            },
          ];
    });
    if (result) setOpen(true);
    return result;
  };
  const updateQuantity = (id, size, color, quantity) =>
    change((previous) =>
      previous.map((i) => {
        if (i.id !== id || i.size !== size || i.color !== color) return i;
        if (
          !Number.isInteger(quantity) ||
          quantity < 1 ||
          quantity > Math.min(i.availableStock || 50, 50)
        )
          throw new Error('That quantity is unavailable.');
        return { ...i, quantity };
      }),
    );
  const removeFromCart = (id, size, color) =>
    change((previous) =>
      previous.filter((i) => !(i.id === id && i.size === size && i.color === color)),
    );
  const afterCheckout = (orderedItems = []) => {
    if (!owner) {
      const remaining = readGuest()
        .items.map((item) => {
          const ordered = orderedItems.find(
            (o) => String(o.product) === item.id && o.color === item.color && o.size === item.size,
          );
          return { ...item, quantity: Math.max(0, item.quantity - (ordered?.quantity || 0)) };
        })
        .filter((item) => item.quantity > 0);
      writeGuest({ ...newGuest(), items: remaining });
      setItems(remaining);
    } else {
      setItems([]);
      setRetry((n) => n + 1);
    }
  };
  return (
    <Context.Provider
      value={{
        cartItems: items,
        subtotal: items.reduce((s, i) => s + Math.round(i.price * 100) * i.quantity, 0) / 100,
        totalItems: items.reduce((s, i) => s + i.quantity, 0),
        ready,
        pending,
        error,
        notice,
        addToCart,
        updateQuantity,
        removeFromCart,
        afterCheckout,
        isDrawerOpen,
        toggleDrawer: () => setOpen((v) => !v),
        closeDrawer: () => setOpen(false),
        retryCart: () => setRetry((n) => n + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
}
