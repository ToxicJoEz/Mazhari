import ContentImage from '../components/ContentImage';
import { StatusBadge } from '../components/OrderStatus';
import { useDialog } from '../context/dialog';
import { useState, useEffect } from 'react';
import { Link, Navigate, useParams, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Copy, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/auth';
import { useResource, money, label, date } from '../lib/store';
import { apiRequest } from '../lib/api';
import { Status, Empty, Notice, Pager } from '../components/UI';
import PageTransition from '../components/PageTransition';
export function OrderContent({ order, children }) {
  const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <>
      <div className="order-banner row between">
        <div>
          <span className="eyebrow">{order.orderNumber}</span>
          <h2>
            <StatusBadge status={order.orderStatus} />
          </h2>
          <p>
            {date(order.createdAt)} · {quantity} {quantity === 1 ? 'item' : 'items'}
          </p>
        </div>
        <div>
          <strong>{money(order.total)}</strong>
          <p>{label(order.paymentStatus)} · Cash on delivery</p>
        </div>
      </div>
      <div className="form-grid">
        <section className="panel">
          <h3>Delivery details</h3>
          <p>{order.customer.name}</p>
          <p>{order.customer.email}</p>
          <p>{order.customer.mobile}</p>
          {order.customer.whatsapp && <p>WhatsApp: {order.customer.whatsapp}</p>}
          <p>{order.shippingAddress.street}</p>
          <p>
            {order.shippingAddress.city}, {order.shippingAddress.governorate}
          </p>
          {order.shippingAddress.zip && <p>Postal code: {order.shippingAddress.zip}</p>}
          {order.shippingAddress.notes && (
            <p className="muted">Note: {order.shippingAddress.notes}</p>
          )}
        </section>
        <section className="panel">
          <h3>Order summary</h3>
          {order.items.map((i, index) => (
            <div className="order-line" key={index}>
              <div className="order-item-name">
                <ContentImage src={i.image} alt={i.title} width={180} />
                <span>
                  {i.title}
                  <small>
                    {i.color} / {i.size} / Qty {i.quantity}
                  </small>
                </span>
              </div>
              <strong>{money(i.price * i.quantity)}</strong>
            </div>
          ))}
          <div className="order-line">
            <span>Shipping</span>
            <strong>{money(order.shippingFee)}</strong>
          </div>
          <div className="order-line">
            <strong>Total</strong>
            <strong>{money(order.total)}</strong>
          </div>
        </section>
      </div>
      <section className="panel order-timeline">
        <h3>Order timeline</h3>
        {[...order.statusHistory].reverse().map((entry, i) => (
          <div key={i}>
            <span className="timeline-dot" />
            <div>
              <strong>{label(entry.status)}</strong>
              <p>{entry.note}</p>
              <small>{date(entry.changedAt)}</small>
            </div>
          </div>
        ))}
      </section>
      {children}
    </>
  );
}
export function MyOrders() {
  const { user, token, loading } = useAuth();
  const [page, setPage] = useState(1);
  const resource = useResource('/orders/my-orders?page=' + page, token, Boolean(user));
  if (loading) return <Status loading />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <PageTransition className="store-page">
      <header className="page-heading compact">
        <Link className="text-link" to="/profile">
          <ArrowLeft size={15} /> My account
        </Link>
        <h1>Your orders.</h1>
      </header>
      <Status {...resource} retry={resource.refresh} />
      {resource.data?.orders.map((order) => (
        <Link className="order-list-card" key={order._id} to={'/orders/' + order.orderNumber}>
          <div>
            <strong>{order.orderNumber}</strong>
            <p>
              {date(order.createdAt)} · {order.items.length} selections
            </p>
          </div>
          <StatusBadge status={order.orderStatus} />
          <strong>{money(order.total)}</strong>
        </Link>
      ))}
      {!resource.loading && !resource.error && !resource.data?.orders.length && (
        <Empty title="Your first order starts here.">
          <Link className="btn" to="/shop">
            Explore the collection
          </Link>
        </Empty>
      )}
      <Pager page={page} pages={resource.data?.pages} onChange={setPage} />
    </PageTransition>
  );
}
export function OrderDetail() {
  const dialog = useDialog();
  const { id } = useParams();
  const { token, user, loading } = useAuth();
  const location = useLocation();
  const [trackingToken] = useState(() => {
    const fragment = location.hash.slice(1);
    if (fragment) return fragment;
    try {
      return JSON.parse(localStorage.getItem('mazhari-tracking') || '{}')[id] || '';
    } catch {
      return '';
    }
  });
  const [state, setState] = useState({ loading: true, error: '', order: null });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (loading) return;
    const controller = new AbortController();
    apiRequest('/orders/' + id, {
      token,
      signal: controller.signal,
      headers: trackingToken ? { 'X-Order-Token': trackingToken } : {},
    })
      .then((data) => {
        if (!controller.signal.aborted) setState({ loading: false, error: '', order: data.order });
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setState({ loading: false, error: err.message, order: null });
      });
    return () => controller.abort();
  }, [id, token, trackingToken, loading, revision]);
  const cancel = async () => {
    if (
      !(await dialog.confirm({
        title: 'Cancel this order?',
        message:
          'Your reserved items will be released. You can place a new order whenever you’re ready.',
        confirmLabel: 'Cancel order',
        cancelLabel: 'Keep order',
        tone: 'danger',
      }))
    )
      return;
    setBusy(true);
    try {
      await apiRequest('/orders/' + state.order._id + '/cancel', {
        token,
        method: 'POST',
        body: JSON.stringify({ reason: 'Cancelled from my account' }),
      });
      setRevision((n) => n + 1);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <PageTransition className="store-page">
      <header className="page-heading compact">
        {location.state?.reused && (
          <p className="notice">
            We already received this checkout. Your saved order is shown below; no second order was
            created.
          </p>
        )}
        {location.state?.placed && (
          <div className="confirmation-note">
            <CheckCircle2 />
            <span>Your order is saved. Thank you for choosing Mazhari.</span>
          </div>
        )}
        <h1>{location.state?.placed ? 'It’s yours.' : 'Your order.'}</h1>
        <p>We’ll contact you before dispatch to confirm delivery.</p>
      </header>
      <Status
        loading={state.loading || loading}
        error={state.error}
        retry={() => setRevision((n) => n + 1)}
      />
      {state.error && (
        <Link className="text-link" to="/track">
          Enter a guest tracking key
        </Link>
      )}
      {state.order && (
        <>
          <OrderContent order={state.order} />
          {trackingToken && !state.order.user && (
            <section className="panel tracking-key">
              <h3>Your private tracking key</h3>
              <p>
                Keep this key to check your guest order. Anyone with it can view the order details.
              </p>
              <code>{trackingToken}</code>
              <button
                className="btn secondary"
                onClick={() =>
                  navigator.clipboard
                    .writeText(trackingToken)
                    .then(() => setNotice('Tracking key copied.'))
                    .catch(() => setNotice('Please select and copy the key above.'))
                }
              >
                <Copy size={16} /> Copy key
              </button>
            </section>
          )}
          <Notice notice={notice} />
          <div className="order-detail-actions">
            {user &&
              String(state.order.user) === (user.id || user._id) &&
              state.order.orderStatus === 'pending' && (
                <button className="btn secondary order-cancel" disabled={busy} onClick={cancel}>
                  Cancel order
                </button>
              )}
            <Link className="btn continue-exploring" to="/shop">
              Continue exploring <ArrowRight size={17} />
            </Link>
          </div>
        </>
      )}
    </PageTransition>
  );
}
export function TrackOrder() {
  const navigate = useNavigate();
  const [number, setNumber] = useState(''),
    [key, setKey] = useState('');
  return (
    <PageTransition className="store-page narrow">
      <header className="page-heading compact">
        <span className="eyebrow">GUEST ORDER TRACKING</span>
        <h1>Follow your piece.</h1>
        <p>
          Enter the order number and private tracking key shown on your confirmation page. Signed-in
          orders are in My orders.
        </p>
      </header>
      <form
        className="panel stack"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(
            '/orders/' + encodeURIComponent(number.trim()) + '#' + encodeURIComponent(key.trim()),
          );
        }}
      >
        <label>
          Order number
          <input
            required
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="MZH-…"
          />
        </label>
        <label>
          Private tracking key
          <input required value={key} onChange={(e) => setKey(e.target.value)} />
        </label>
        <button className="btn">Track order</button>
        <Link className="text-link" to="/orders">
          My account orders
        </Link>
      </form>
    </PageTransition>
  );
}
