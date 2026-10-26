import ContentImage from '../components/ContentImage';
/* eslint-disable react/set-state-in-effect -- Prefill authenticated details and clear the previous server quote when the delivery selection changes. */
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LockKeyhole, Truck } from 'lucide-react';
import { useCart } from '../context/cart';
import { useAuth } from '../context/auth';
import { useStore } from '../context/store';
import { apiRequest } from '../lib/api';
import { money } from '../lib/store';
import { Status, Notice, Empty } from '../components/UI';
import PageTransition from '../components/PageTransition';
function checkoutKey() {
  try {
    let value = sessionStorage.getItem('mazhari-checkout-key');
    if (!value) {
      value = crypto.randomUUID();
      sessionStorage.setItem('mazhari-checkout-key', value);
    }
    return value;
  } catch {
    return crypto.randomUUID();
  }
}
const empty = {
  name: '',
  email: '',
  mobile: '',
  whatsapp: '',
  street: '',
  city: '',
  governorate: '',
  zip: '',
  notes: '',
};
export default function Checkout() {
  const cart = useCart();
  const { user, token, loading } = useAuth();
  const store = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => {
    try {
      return {
        ...empty,
        ...JSON.parse(sessionStorage.getItem('mazhari-checkout-draft') || 'null'),
      };
    } catch {
      return empty;
    }
  });
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const requestKey = useRef(checkoutKey());
  useEffect(() => {
    if (user)
      setForm((f) => ({
        ...f,
        name: f.name || user.name,
        email: f.email || user.email,
        mobile: f.mobile || user.mobile,
        ...(!f.street && user.addresses?.length ? user.addresses[0] : {}),
      }));
  }, [user]);
  const serialized = JSON.stringify(
    cart.cartItems.map((i) => ({
      productId: i.id,
      color: i.color,
      size: i.size,
      quantity: i.quantity,
    })),
  );
  useEffect(() => {
    setQuote(null);
    setQuoteError('');
    if (!form.governorate || !cart.ready || !cart.cartItems.length) {
      setQuoting(false);
      return;
    }
    const controller = new AbortController();
    setQuoting(true);
    apiRequest('/orders/quote', {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({ governorate: form.governorate, items: JSON.parse(serialized) }),
    })
      .then((data) => {
        if (!controller.signal.aborted) setQuote(data.quote);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setQuoteError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setQuoting(false);
      });
    return () => controller.abort();
  }, [form.governorate, serialized, cart.ready, cart.cartItems.length, refresh]);
  const field = (event) => {
    setForm((f) => ({ ...f, [event.target.name]: event.target.value }));
  };
  const saveDraft = () => {
    try {
      sessionStorage.setItem('mazhari-checkout-draft', JSON.stringify(form));
    } catch {
      /* Draft is optional. */
    }
  };
  async function submit(event) {
    event.preventDefault();
    if (busy || !quote || !accepted) return;
    setBusy(true);
    setError('');
    saveDraft();
    try {
      const data = await apiRequest('/orders', {
        token,
        method: 'POST',
        body: JSON.stringify({
          customer: {
            name: form.name,
            email: form.email,
            mobile: form.mobile,
            whatsapp: form.whatsapp,
          },
          shippingAddress: {
            street: form.street,
            city: form.city,
            governorate: form.governorate,
            zip: form.zip,
            notes: form.notes,
          },
          items: JSON.parse(serialized),
          expectedTotal: quote.total,
          acceptedTerms: accepted,
          idempotencyKey: requestKey.current,
        }),
      });
      if (data.trackingToken) {
        try {
          const saved = JSON.parse(localStorage.getItem('mazhari-tracking') || '{}');
          localStorage.setItem(
            'mazhari-tracking',
            JSON.stringify({ ...saved, [data.order.orderNumber]: data.trackingToken }),
          );
        } catch {
          /* The confirmation still displays its tracking key. */
        }
      }
      try {
        sessionStorage.removeItem('mazhari-checkout-draft');
        sessionStorage.removeItem('mazhari-checkout-key');
      } catch {}
      cart.afterCheckout(data.order.items);
      navigate(
        '/orders/' + data.order.orderNumber + (data.trackingToken ? '#' + data.trackingToken : ''),
        { state: { placed: true }, replace: true },
      );
    } catch (err) {
      if (err.data?.savedOrder) {
        const saved = err.data.savedOrder;
        cart.afterCheckout(saved.items);
        try {
          if (err.data.trackingToken) {
            const tracked = JSON.parse(localStorage.getItem('mazhari-tracking') || '{}');
            localStorage.setItem(
              'mazhari-tracking',
              JSON.stringify({ ...tracked, [saved.orderNumber]: err.data.trackingToken }),
            );
          }
          sessionStorage.removeItem('mazhari-checkout-key');
          sessionStorage.removeItem('mazhari-checkout-draft');
        } catch {}
        navigate(
          '/orders/' +
            saved.orderNumber +
            (err.data.trackingToken ? '#' + err.data.trackingToken : ''),
          { state: { reused: true }, replace: true },
        );
        return;
      }
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <PageTransition className="store-page">
        <Status loading />
      </PageTransition>
    );
  if (!cart.ready)
    return (
      <PageTransition className="store-page">
        <Status loading={!cart.error} error={cart.error} retry={cart.retryCart} />
      </PageTransition>
    );
  if (!cart.cartItems.length)
    return (
      <PageTransition className="store-page">
        <Empty title="Your bag is waiting for its first piece.">
          <Link to="/shop" className="btn">
            Explore the collection
          </Link>
        </Empty>
      </PageTransition>
    );
  return (
    <PageTransition className="store-page">
      <header className="page-heading compact">
        <span className="eyebrow">THE FINAL DETAILS</span>
        <h1>Make it yours.</h1>
        <p>Secure checkout. Payment in cash on delivery.</p>
      </header>
      {!user && (
        <div className="guest-prompt">
          <div>
            <strong>Have a Mazhari account?</strong>
            <p>
              Sign in to save your bag and find your orders in one place. Your selections come with
              you.
            </p>
          </div>
          <div className="row">
            <Link className="btn secondary" onClick={saveDraft} to="/login?next=/checkout">
              Sign in
            </Link>
            <Link className="text-link" onClick={saveDraft} to="/register?next=/checkout">
              Create account
            </Link>
          </div>
          <small>Or continue below as a guest.</small>
        </div>
      )}
      <Notice error={cart.error} notice={cart.notice} />
      <div className="checkout-columns">
        <form className="panel checkout-form" onSubmit={submit}>
          <h2>01 / Contact details</h2>
          <div className="form-grid">
            <label>
              Full name
              <input
                name="name"
                required
                autoComplete="name"
                maxLength={100}
                value={form.name}
                onChange={field}
              />
            </label>
            <label>
              Email
              <input
                name="email"
                required
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={field}
              />
            </label>
            <label>
              Mobile number
              <input
                name="mobile"
                required
                type="tel"
                autoComplete="tel"
                value={form.mobile}
                onChange={field}
              />
            </label>
            <label>
              WhatsApp <span className="muted">(optional)</span>
              <input name="whatsapp" type="tel" value={form.whatsapp} onChange={field} />
            </label>
          </div>
          <h2>02 / Delivery address</h2>
          {user?.addresses?.length > 0 && (
            <label>
              Use a saved address
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value !== '')
                    setForm((f) => ({ ...f, ...user.addresses[Number(e.target.value)] }));
                }}
              >
                <option value="">Choose an address</option>
                {user.addresses.map((a, i) => (
                  <option value={i} key={a._id || i}>
                    {a.street}, {a.governorate}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="form-grid">
            <label>
              Governorate
              <select name="governorate" required value={form.governorate} onChange={field}>
                <option value="">Choose governorate</option>
                {store.settings?.shippingRates.map((rate) => (
                  <option key={rate.governorate}>{rate.governorate}</option>
                ))}
              </select>
            </label>
            <label>
              City / district
              <input
                name="city"
                required
                autoComplete="address-level2"
                maxLength={100}
                value={form.city}
                onChange={field}
              />
            </label>
            <label className="span-2">
              Street, building & apartment
              <input
                name="street"
                required
                autoComplete="street-address"
                maxLength={300}
                value={form.street}
                onChange={field}
              />
            </label>
            <label>
              Postal code <span className="muted">(optional)</span>
              <input
                name="zip"
                maxLength={20}
                autoComplete="postal-code"
                value={form.zip}
                onChange={field}
              />
            </label>
            <label className="span-2">
              Delivery notes <span className="muted">(optional)</span>
              <textarea
                name="notes"
                maxLength={1000}
                rows={3}
                value={form.notes}
                onChange={field}
              />
            </label>
          </div>
          <h2>03 / Payment</h2>
          <div className="payment-choice">
            <Truck size={22} />
            <div>
              <strong>Cash on delivery</strong>
              <p>
                Pay the displayed total when your order arrives. We’ll contact you to confirm before
                dispatch.
              </p>
            </div>
          </div>
          <label className="check">
            <input
              type="checkbox"
              required
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              I agree to the{' '}
              <Link to="/terms" className="text-link">
                store terms
              </Link>{' '}
              and have read the{' '}
              <Link to="/shipping" className="text-link">
                delivery and final-sale policy
              </Link>
              .
            </span>
          </label>
          <Notice error={error} />
          <button
            className="btn wide"
            disabled={busy || !quote || quoting || !cart.ready || cart.pending || !accepted}
          >
            {busy
              ? 'Placing your order…'
              : quote
                ? 'Place COD order · ' + money(quote.total)
                : 'Choose delivery details'}
            <LockKeyhole size={16} />
          </button>
        </form>
        <aside className="panel checkout-summary">
          <h2>Your selection</h2>
          {(quote?.items || cart.cartItems).map((i) => (
            <div className="summary-item" key={(i.product || i.id) + i.color + i.size}>
              <ContentImage src={i.image || i.images?.[0]} alt={i.title || i.name} width={160} />
              <div>
                <strong>{i.title || i.name}</strong>
                <p>
                  {i.color} / {i.size} / Qty {i.quantity}
                </p>
                <span>{money(i.price * i.quantity)}</span>
              </div>
            </div>
          ))}
          <div className="summary-totals">
            <div className="row between">
              <span>Subtotal</span>
              <strong>{money(quote?.subtotal ?? cart.subtotal)}</strong>
            </div>
            <div className="row between">
              <span>Shipping</span>
              <span>
                {quoting ? 'Calculating…' : quote ? money(quote.shippingFee) : 'Choose governorate'}
              </span>
            </div>
            <div className="row between grand-total">
              <span>Total</span>
              <strong>{quote ? money(quote.total) : '—'}</strong>
            </div>
          </div>
          <Notice error={quoteError} />
          {quoteError && (
            <>
              <button className="text-link" onClick={() => setRefresh((n) => n + 1)}>
                Refresh summary
              </button>
              <p>
                <Link className="text-link" to="/contact">
                  Contact us about delivery
                </Link>
              </p>
            </>
          )}
          <button
            type="button"
            className="text-link space-top"
            disabled={quoting}
            onClick={() => {
              setError('');
              setRefresh((n) => n + 1);
            }}
          >
            Refresh prices & shipping
          </button>
          <Status loading={store.loading} error={store.error} retry={store.refresh} />
          <p className="muted small">
            Prices and availability are checked before your order is saved.
          </p>
        </aside>
      </div>
    </PageTransition>
  );
}
