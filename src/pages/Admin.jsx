import AdminOrderBell from '../components/AdminOrderBell';
import { useOrderNotifications } from '../context/notifications';
import { StatusBadge, StatusButtons } from '../components/OrderStatus';
import { useDialog } from '../context/dialog';
import Select from '../components/Select';
import MediaPicker from '../components/MediaPicker';
import ContentImage from '../components/ContentImage';
import { useState } from 'react';
import { Link, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  Settings,
  Inbox,
  ArrowUpRight,
  Plus,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/auth';
import { useStore } from '../context/store';
import { useResource, money, date, label } from '../lib/store';
import { apiRequest } from '../lib/api';
import { PAYMENT_STATUSES } from '../../shared/constants';
import { Status, Empty, Notice, Modal, Pager } from '../components/UI';
import { OrderContent } from './Orders';

function useAction(refresh) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function run(work, message = 'Changes saved.') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await work();
      setNotice(message);
      refresh?.(result);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, notice, run };
}
function SearchBar({ onSearch, placeholder = 'Search…', children }) {
  return (
    <form
      className="admin-toolbar"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(new FormData(e.currentTarget).get('search'));
      }}
    >
      <div className="search-input">
        <Search size={17} />
        <input name="search" type="search" aria-label={placeholder} placeholder={placeholder} />
      </div>
      <button className="btn secondary">Search</button>
      {children}
    </form>
  );
}
function Overview({ token }) {
  const resource = useResource('/admin/metrics', token);
  const m = resource.data?.metrics;
  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">YOUR STORE AT A GLANCE</span>
          <h1>Good to see you.</h1>
          <p>Orders, stock, customers, and cash. All in one place.</p>
        </div>
      </div>
      <Status {...resource} retry={resource.refresh} />
      {m && (
        <>
          <div className="metric-grid">
            {[
              ['Cash collected', money(m.cashCollected)],
              ['Total orders', m.totalOrders],
              ['Awaiting fulfilment', m.pendingOrders],
              ['Active customers', m.customers],
              ['Low-stock products', m.lowStock],
              ['Password requests', m.pendingRequests],
            ].map(([title, value]) => (
              <article className="metric" key={title}>
                <span>{title}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          {m.unconfiguredShipping > 0 && (
            <div className="notice warning">
              <strong>{m.unconfiguredShipping} governorates need a delivery rate.</strong>
              <p>Customers cannot complete checkout for these locations until a rate is saved.</p>
              <Link className="text-link" to="/admin/shipping">
                Set shipping rates <ArrowUpRight size={16} />
              </Link>
            </div>
          )}
          <div className="admin-quick-links">
            {[
              [
                '/admin/products',
                'Manage the collection',
                'Add products, edit variants, and control available stock.',
              ],
              [
                '/admin/orders',
                'Fulfil your orders',
                'Review customer details, move statuses, and record cash.',
              ],
              [
                '/admin/settings',
                'Make the store yours',
                'Edit your homepage and customer contact information.',
              ],
            ].map(([to, title, desc]) => (
              <Link key={to} className="panel" to={to}>
                <ArrowUpRight />
                <h2>{title}</h2>
                <p>{desc}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function ProductForm({ product, token, onSaved, onClose }) {
  const [form, setForm] = useState(
    product
      ? {
          ...product,
          images: product.images.join('\n'),
          variants: product.variants.map((v) => ({ ...v })),
        }
      : {
          title: '',
          description: '',
          category: '',
          basePrice: '',
          material: '',
          care: '',
          images: '',
          variants: [{ color: 'Black', size: 'M', stock: 0 }],
          isActive: true,
          featured: false,
        },
  );
  const [uploading, setUploading] = useState(false);
  const action = useAction();
  const field = (e) =>
    setForm((f) => ({
      ...f,
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));
  const variant = (index, key, value) =>
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => (i === index ? { ...v, [key]: value } : v)),
    }));
  return (
    <Modal title={product ? 'Edit product' : 'Add a product'} onClose={onClose}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (uploading) return;
          const ok = await action.run(() =>
            apiRequest('/admin/products' + (product ? '/' + product._id : ''), {
              token,
              method: product ? 'PUT' : 'POST',
              body: JSON.stringify({
                ...form,
                basePrice: Number(form.basePrice),
                images: form.images
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
                variants: form.variants.map((v) => ({ ...v, stock: Number(v.stock) })),
              }),
            }),
          );
          if (ok) onSaved();
        }}
      >
        <div className="form-grid">
          <label>
            Product name
            <input name="title" required maxLength={150} value={form.title} onChange={field} />
          </label>
          <label>
            Collection
            <input
              name="category"
              required
              maxLength={80}
              value={form.category}
              onChange={field}
              placeholder="e.g. Suede"
            />
          </label>
          <label>
            Price (EGP)
            <input
              name="basePrice"
              required
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              value={form.basePrice}
              onChange={field}
            />
          </label>
          <label>
            Material
            <input name="material" maxLength={300} value={form.material} onChange={field} />
          </label>
          <label className="span-2">
            Description
            <textarea
              name="description"
              maxLength={4000}
              rows={3}
              value={form.description}
              onChange={field}
            />
          </label>
          <label className="span-2">
            Care instructions
            <textarea name="care" maxLength={500} value={form.care} onChange={field} />
          </label>
          <div className="span-2 image-library">
            <h3>Product photos</h3>
            <MediaPicker
              token={token}
              selected={form.images.split('\n').filter(Boolean)}
              onChange={(images) => setForm((f) => ({ ...f, images: images.join('\n') }))}
              onBusy={setUploading}
            />
          </div>
        </div>
        <div className="row">
          <label className="check">
            <input name="isActive" type="checkbox" checked={form.isActive} onChange={field} />
            Published in store
          </label>
          <label className="check">
            <input name="featured" type="checkbox" checked={form.featured} onChange={field} />
            Featured
          </label>
        </div>
        <h3>Size / color stock</h3>
        <p className="muted small">
          Stock is the quantity currently available to sell. Existing reservations are already
          deducted. Keep variants used in existing orders; set their stock to zero to stop selling
          them.
        </p>
        <div className="variant-table">
          <div className="variant-row">
            <strong>Color</strong>
            <strong>Size</strong>
            <strong>Stock</strong>
            <span />
          </div>
          {form.variants.map((v, i) => (
            <div className="variant-row" key={i}>
              <input
                aria-label={'Color ' + (i + 1)}
                required
                maxLength={80}
                value={v.color}
                onChange={(e) => variant(i, 'color', e.target.value)}
              />
              <input
                aria-label={'Size ' + (i + 1)}
                required
                maxLength={30}
                value={v.size}
                onChange={(e) => variant(i, 'size', e.target.value)}
              />
              <input
                aria-label={'Stock ' + (i + 1)}
                type="number"
                required
                min="0"
                max="100000"
                step="1"
                value={v.stock}
                onChange={(e) => variant(i, 'stock', e.target.value)}
              />
              <button
                type="button"
                className="text-link"
                disabled={form.variants.length === 1}
                onClick={() =>
                  setForm((f) => ({ ...f, variants: f.variants.filter((_, n) => n !== i) }))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn secondary"
          disabled={form.variants.length >= 200}
          onClick={() =>
            setForm((f) => ({ ...f, variants: [...f.variants, { color: '', size: '', stock: 0 }] }))
          }
        >
          Add variant
        </button>
        <Notice {...action} />
        <button className="btn" disabled={action.busy || uploading}>
          {action.busy ? 'Saving…' : 'Save product'}
        </button>
      </form>
    </Modal>
  );
}
function Products({ token }) {
  const dialog = useDialog();
  const [query, setQuery] = useState(''),
    [page, setPage] = useState(1),
    [status, setStatus] = useState(''),
    [category, setCategory] = useState(''),
    [editing, setEditing] = useState(null);
  const resource = useResource(
    '/admin/products?page=' +
      page +
      '&search=' +
      encodeURIComponent(query) +
      '&status=' +
      status +
      '&category=' +
      encodeURIComponent(category),
    token,
  );
  const action = useAction(resource.refresh);
  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">THE COLLECTION</span>
          <h1>Products & inventory.</h1>
        </div>
        <button className="btn" onClick={() => setEditing({ new: true })}>
          <Plus size={17} /> Add product
        </button>
      </div>
      <SearchBar
        onSearch={(value) => {
          setQuery(value);
          setPage(1);
        }}
        placeholder="Search product names"
      >
        <Select
          aria-label="Collection"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All collections</option>
          {resource.data?.collections?.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Product status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All products</option>
          <option value="active">Not deleted</option>
          <option value="deleted">Deleted</option>
        </Select>
      </SearchBar>
      <Notice {...action} />
      <Status {...resource} retry={resource.refresh} />
      {resource.data?.products.length > 0 ? (
        <div className="admin-product-grid">
          {resource.data.products.map((p) => (
            <article className="admin-product-card" key={p._id}>
              <div className="admin-product-photo">
                <ContentImage src={p.images[0]} alt={p.title} loading="lazy" />
                <span className="badge">
                  {p.isDeleted ? 'Deleted' : p.isActive ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="admin-product-info">
                <span className="eyebrow">{p.category}</span>
                <h2>{p.title}</h2>
                <strong className="admin-product-price">{money(p.basePrice)}</strong>
                <div className="admin-product-stock">
                  <span>
                    <strong>{p.variants.reduce((n, v) => n + v.stock, 0)}</strong> in stock
                  </span>
                  <span>{p.variants.length} variants</span>
                </div>
                <p className="muted small">
                  {p.variants.filter((v) => v.stock <= 3).length} variants low / out
                </p>
                <div className="admin-product-actions">
                  <button className="text-link" onClick={() => setEditing(p)}>
                    Edit
                  </button>
                  {p.isDeleted ? (
                    <button
                      className="text-link"
                      disabled={action.busy}
                      onClick={() =>
                        action.run(
                          () =>
                            apiRequest('/admin/products/' + p._id + '/restore', {
                              token,
                              method: 'PATCH',
                            }),
                          'Product restored.',
                        )
                      }
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      className="text-link danger"
                      disabled={action.busy}
                      onClick={async () => {
                        if (
                          await dialog.confirm(
                            'Remove this product from the store? You can restore it later.',
                          )
                        )
                          action.run(
                            () =>
                              apiRequest('/admin/products/' + p._id, {
                                token,
                                method: 'DELETE',
                              }),
                            'Product soft-deleted.',
                          );
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        !resource.loading &&
        !resource.error && (
          <Empty title={query || category || status ? 'No matching products.' : 'No products yet.'}>
            <p>
              {query || category || status
                ? 'Try another search, collection, or status.'
                : 'Add your first piece with its price, sizes, colors and available stock.'}
            </p>
          </Empty>
        )
      )}
      <Pager page={page} pages={resource.data?.pages} onChange={setPage} />
      {editing && (
        <ProductForm
          product={editing.new ? null : editing}
          token={token}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            resource.refresh();
          }}
        />
      )}
    </>
  );
}

function OrderEditor({ order, token, onClose, onUpdated }) {
  const dialog = useDialog();
  const notifications = useOrderNotifications();
  const [current, setCurrent] = useState(order),
    [status, setStatus] = useState(order.orderStatus),
    [payment, setPayment] = useState(order.paymentStatus),
    [note, setNote] = useState('');
  const action = useAction(onUpdated);
  async function update(path, body) {
    const data = await apiRequest('/admin/orders/' + order._id + path, {
      token,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    setCurrent(data.order);
    notifications.refresh();
    return data.order;
  }
  return (
    <Modal title={order.orderNumber} onClose={onClose} className="modal-wide order-editor">
      <OrderContent order={current} />
      <div className="form-grid">
        <form
          className="panel stack"
          onSubmit={async (event) => {
            event.preventDefault();
            if (
              status === 'cancelled' &&
              !(await dialog.confirm({
                title: 'Cancel this order?',
                message:
                  'Reserved stock will be released. The customer will see this status and your note.',
                confirmLabel: 'Cancel order',
                cancelLabel: 'Keep order',
                tone: 'danger',
              }))
            )
              return;
            action.run(() => update('/status', { status, note }), 'Order status saved.');
          }}
        >
          <h3>Fulfilment status</h3>
          <StatusButtons value={status} onChange={setStatus} disabled={action.busy} />
          <label>
            Customer-visible note / reason
            <textarea
              value={note}
              maxLength={1000}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <button className="btn" disabled={action.busy || status === current.orderStatus}>
            Save status
          </button>
          <p className="muted small">
            Cancelling releases stock. Reopening reserves it again and requires available stock.
            Cash collection is recorded separately.
          </p>
        </form>
        <form
          className="panel stack"
          onSubmit={async (event) => {
            event.preventDefault();
            if (
              !(await dialog.confirm({
                title:
                  payment === 'cash_collected' ? 'Confirm cash collection' : 'Update cash record?',
                message:
                  payment === 'cash_collected'
                    ? `Confirm that ${money(current.total)} was collected for ${current.orderNumber}. This records the actual cash received.`
                    : `Change the cash record from ${label(current.paymentStatus)} to ${label(payment)} for ${current.orderNumber}?`,
                confirmLabel:
                  payment === 'cash_collected' ? 'Confirm cash received' : 'Update cash record',
                cancelLabel: 'Keep unchanged',
              }))
            )
              return;
            action.run(() => update('/payment', { paymentStatus: payment }), 'Cash status saved.');
          }}
        >
          <h3>Cash collection</h3>
          <StatusBadge status={current.paymentStatus} />
          <Select
            aria-label="Payment status"
            value={payment}
            onChange={(event) => setPayment(event.target.value)}
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </Select>
          <button
            className="btn secondary"
            disabled={action.busy || payment === current.paymentStatus}
          >
            Save cash status
          </button>
          <p className="muted small">
            Record collected cash separately from delivery. Reconcile cash before cancelling a
            collected order.
          </p>
        </form>
      </div>
      <Notice {...action} />
    </Modal>
  );
}
function Orders({ token }) {
  const navigate = useNavigate(),
    location = useLocation();
  const orderId = new URLSearchParams(location.search).get('order');
  const [query, setQuery] = useState(''),
    [page, setPage] = useState(1),
    [status, setStatus] = useState(''),
    [payment, setPayment] = useState(''),
    [manualOrder, setSelected] = useState(null);
  const resource = useResource(
    '/admin/orders?page=' +
      page +
      '&search=' +
      encodeURIComponent(query) +
      '&status=' +
      status +
      '&payment=' +
      payment,
    token,
  );
  const linked = useResource(
    '/admin/orders/' + encodeURIComponent(orderId || ''),
    token,
    Boolean(orderId),
  );
  const selected = manualOrder || (orderId ? linked.data?.order : null);
  function closeOrder() {
    setSelected(null);
    if (orderId) navigate('/admin/orders', { replace: true });
  }
  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">FROM BAG TO DOORSTEP</span>
          <h1>Orders.</h1>
          <p>Review every order and keep delivery and cash records accurate.</p>
        </div>
      </div>
      <StatusButtons
        all
        value={status}
        onChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        counts={resource.data?.statusCounts}
        ariaLabel="Filter orders by status"
      />
      <SearchBar
        onSearch={(value) => {
          setQuery(value);
          setPage(1);
        }}
        placeholder="Order, name, email or phone"
      >
        <Select
          aria-label="Filter payment status"
          value={payment}
          onChange={(event) => {
            setPayment(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All cash statuses</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </Select>
      </SearchBar>
      <div className="order-results" role="status">
        {resource.data
          ? `${resource.data.total} orders · ${resource.data.totalItems} items`
          : 'Loading orders...'}
      </div>
      <Status {...resource} retry={resource.refresh} />
      {orderId && <Status {...linked} retry={linked.refresh} />}
      {resource.data?.orders.length > 0 ? (
        <div className="table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Delivery</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Cash</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resource.data.orders.map((o) => (
                <tr key={o._id}>
                  <td>
                    <strong>{o.orderNumber}</strong>
                    <small>{date(o.createdAt)}</small>
                  </td>
                  <td>
                    {o.customer.name}
                    <small>{o.customer.mobile}</small>
                  </td>
                  <td>
                    {o.shippingAddress.governorate}
                    <small>{o.user ? 'Account' : 'Guest'}</small>
                  </td>
                  <td>
                    <strong>{o.items.reduce((sum, item) => sum + item.quantity, 0)}</strong>
                    <small>
                      {o.items.length} {o.items.length === 1 ? 'selection' : 'selections'}
                    </small>
                  </td>
                  <td>{money(o.total)}</td>
                  <td>
                    <StatusBadge status={o.orderStatus} />
                  </td>
                  <td>
                    <StatusBadge status={o.paymentStatus} />
                  </td>
                  <td>
                    <button className="btn secondary compact-btn" onClick={() => setSelected(o)}>
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !resource.loading && !resource.error && <Empty title="No matching orders." />
      )}
      <Pager page={page} pages={resource.data?.pages} onChange={setPage} />
      {selected && (
        <OrderEditor
          key={selected._id}
          order={selected}
          token={token}
          onClose={closeOrder}
          onUpdated={(updated) => {
            setSelected(updated);
            resource.refresh();
            if (orderId) linked.refresh();
          }}
        />
      )}
    </>
  );
}

function CustomerDetail({ id, token, onClose, onUpdated }) {
  const r = useResource('/admin/users/' + id, token);
  const action = useAction(() => {
    r.refresh();
    onUpdated?.();
  });
  return (
    <Modal title="Customer details" onClose={onClose}>
      <Status {...r} retry={r.refresh} />
      {r.data && (
        <>
          <h3>{r.data.user.name}</h3>
          <p>
            {r.data.user.email} · {r.data.user.mobile}
          </p>
          {r.data.user.role !== 'admin' && (
            <>
              <form
                className="stack panel space-top"
                onSubmit={(event) => {
                  event.preventDefault();
                  action.run(
                    () =>
                      apiRequest('/admin/users/' + id, {
                        token,
                        method: 'PUT',
                        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
                      }),
                    'Customer details saved.',
                  );
                }}
              >
                <h3>Edit customer details</h3>
                <label>
                  Name
                  <input name="name" required maxLength={100} defaultValue={r.data.user.name} />
                </label>
                <label>
                  Mobile
                  <input name="mobile" type="tel" required defaultValue={r.data.user.mobile} />
                </label>
                <button className="btn secondary" disabled={action.busy}>
                  Save customer details
                </button>
              </form>
              <details className="panel space-top">
                <summary>Manually set a temporary password</summary>
                <form
                  className="stack space-top"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const body = Object.fromEntries(new FormData(form));
                    action.run(async () => {
                      await apiRequest('/admin/users/' + id + '/set-password', {
                        token,
                        method: 'POST',
                        body: JSON.stringify(body),
                      });
                      form.reset();
                    }, 'Password reset. Previous sessions have ended.');
                  }}
                >
                  <p className="muted">
                    Verify the customer using their registered contact details first. No automatic
                    message is sent.
                  </p>
                  <label>
                    Temporary password
                    <input
                      type="password"
                      name="newPassword"
                      required
                      minLength={8}
                      maxLength={72}
                      autoComplete="new-password"
                    />
                  </label>
                  <label className="check">
                    <input type="checkbox" required />I have verified the customer’s identity.
                  </label>
                  <button className="btn secondary" disabled={action.busy}>
                    Set temporary password
                  </button>
                </form>
              </details>
            </>
          )}
          <Notice {...action} />
          <h3 className="space-top">Recent orders</h3>
          {r.data.orders.length ? (
            r.data.orders.map((o) => (
              <div className="order-line" key={o._id}>
                <span>
                  {o.orderNumber}
                  <small>{label(o.orderStatus)}</small>
                </span>
                <strong>{money(o.total)}</strong>
              </div>
            ))
          ) : (
            <p>No orders yet.</p>
          )}
        </>
      )}
    </Modal>
  );
}
function UsersPanel({ token }) {
  const dialog = useDialog();
  const [query, setQuery] = useState(''),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null);
  const r = useResource(
    '/admin/users?page=' + page + '&search=' + encodeURIComponent(query),
    token,
  );
  const a = useAction(r.refresh);
  const command = (u, suffix, method = 'PATCH', body = {}) =>
    a.run(
      () =>
        apiRequest('/admin/users/' + u._id + suffix, { token, method, body: JSON.stringify(body) }),
      'Account updated.',
    );
  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">YOUR COMMUNITY</span>
          <h1>Customers.</h1>
        </div>
      </div>
      <SearchBar
        onSearch={(q) => {
          setQuery(q);
          setPage(1);
        }}
        placeholder="Name, email or mobile"
      />
      <Notice {...a} />
      <Status {...r} retry={r.refresh} />
      {r.data?.users.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {r.data.users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <strong>{u.name}</strong>
                    <small>{label(u.role)}</small>
                  </td>
                  <td>
                    {u.email}
                    <small>{u.mobile}</small>
                  </td>
                  <td>{u.isDeleted ? 'Deleted' : u.isBanned ? 'Suspended' : 'Active'}</td>
                  <td>
                    <div className="row">
                      <button className="text-link" onClick={() => setSelected(u._id)}>
                        Details & orders
                      </button>
                      {u.role !== 'admin' && (
                        <>
                          {u.isBanned ? (
                            <button
                              className="text-link"
                              disabled={a.busy}
                              onClick={() => command(u, '/unban')}
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              className="text-link"
                              disabled={a.busy}
                              onClick={async () => {
                                const reason = await dialog.prompt(
                                  'Reason for suspending this account:',
                                );
                                if (reason) command(u, '/ban', 'PATCH', { reason });
                              }}
                            >
                              Ban
                            </button>
                          )}
                          {u.isDeleted ? (
                            <button
                              className="text-link"
                              disabled={a.busy}
                              onClick={() => command(u, '/restore')}
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              className="text-link danger"
                              disabled={a.busy}
                              onClick={async () => {
                                if (
                                  await dialog.confirm(
                                    'Deactivate this customer account? It can be restored.',
                                  )
                                )
                                  command(u, '', 'DELETE');
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !r.loading && !r.error && <Empty title="No customers match." />
      )}
      <Pager page={page} pages={r.data?.pages} onChange={setPage} />
      {selected && (
        <CustomerDetail
          id={selected}
          token={token}
          onUpdated={r.refresh}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function ResetDialog({ request, token, onClose, onSaved }) {
  const a = useAction();
  return (
    <Modal title="Resolve password request" onClose={onClose}>
      <p>
        {request.email}
        <br />
        {request.mobile}
      </p>
      <p className="notice warning">
        Contact the customer using their registered number and verify their identity before setting
        a temporary password. This action does not send a message automatically.
      </p>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const body = Object.fromEntries(new FormData(e.currentTarget));
          if (
            await a.run(() =>
              apiRequest('/admin/password-requests/' + request._id + '/fulfill', {
                token,
                method: 'POST',
                body: JSON.stringify(body),
              }),
            )
          )
            onSaved();
        }}
      >
        <label>
          New temporary password
          <input
            type="password"
            name="newPassword"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
          />
        </label>
        <label>
          Verification notes
          <textarea name="adminNotes" required maxLength={1000} />
        </label>
        <label className="check">
          <input type="checkbox" required />I have verified this customer’s identity.
        </label>
        <Notice {...a} />
        <button className="btn" disabled={a.busy}>
          Set password & resolve
        </button>
      </form>
    </Modal>
  );
}
function Support({ token }) {
  const [selected, setSelected] = useState(null);
  const [inboxStatus, setInboxStatus] = useState('new');
  const [inboxPage, setInboxPage] = useState(1);
  const resets = useResource('/admin/password-requests?status=pending', token),
    messages = useResource('/admin/inquiries?status=' + inboxStatus + '&page=' + inboxPage, token);
  const a = useAction(messages.refresh);
  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">CLIENT SERVICES</span>
          <h1>Support inbox.</h1>
        </div>
      </div>
      <section className="panel">
        <h2>Password reset requests</h2>
        <Status {...resets} retry={resets.refresh} />
        {resets.data?.requests.map((request) => (
          <div className="inbox-row" key={request._id}>
            <div>
              <strong>{request.email}</strong>
              <p>{request.mobile}</p>
              <small>{date(request.createdAt)}</small>
            </div>
            <button className="btn secondary" onClick={() => setSelected(request)}>
              Verify & reset
            </button>
          </div>
        ))}
        {resets.data?.requests.length === 0 && (
          <p className="muted">No pending password requests.</p>
        )}
      </section>
      <section className="panel space-top">
        <div className="row between">
          <h2>Customer messages</h2>
          <Select
            aria-label="Message status"
            value={inboxStatus}
            onChange={(event) => {
              setInboxStatus(event.target.value);
              setInboxPage(1);
            }}
          >
            <option value="new">New messages</option>
            <option value="resolved">Resolved messages</option>
          </Select>
        </div>
        <Notice {...a} />
        <Status {...messages} retry={messages.refresh} />
        {messages.data?.inquiries.map((m) => (
          <article className="inbox-message" key={m._id}>
            <div className="row between">
              <strong>{m.name}</strong>
              <span className="badge">{label(m.status)}</span>
            </div>
            <p>
              <a className="text-link" href={'mailto:' + m.email}>
                {m.email}
              </a>{' '}
              {m.mobile}
            </p>
            <p className="message-body">{m.message}</p>
            <small>{date(m.createdAt)}</small>
            {m.status === 'new' && (
              <button
                className="text-link"
                disabled={a.busy}
                onClick={() =>
                  a.run(
                    () =>
                      apiRequest('/admin/inquiries/' + m._id + '/resolve', {
                        token,
                        method: 'PATCH',
                      }),
                    'Message marked resolved.',
                  )
                }
              >
                Mark resolved
              </button>
            )}
          </article>
        ))}
        {messages.data?.inquiries.length === 0 && <p className="muted">No matching messages.</p>}
        <Pager page={inboxPage} pages={messages.data?.pages} onChange={setInboxPage} />
      </section>
      {selected && (
        <ResetDialog
          request={selected}
          token={token}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            resets.refresh();
          }}
        />
      )}
    </>
  );
}

function CollectionCoverControls({ token, value = [], onChange, onBusy }) {
  const categories = useResource('/admin/products?limit=1', token);
  const [category, setCategory] = useState('');
  const names = [
    ...new Set([...(categories.data?.collections || []), ...value.map((row) => row.category)]),
  ].sort();
  const current = value.find((row) => row.category === category)?.image;
  return (
    <div className="stack">
      <h2>Collection covers</h2>
      <p className="muted small">
        Choose a cover for each collection. Until you choose one, its first available product photo
        is used.
      </p>
      <label>
        Collection cover
        <Select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Choose a collection</option>
          {names.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </label>
      {categories.error && (
        <p role="alert" className="error">
          {categories.error}
        </p>
      )}
      {category && (
        <MediaPicker
          key={category}
          token={token}
          purpose="collection"
          max={1}
          selected={current ? [current] : []}
          onBusy={onBusy}
          onChange={(images) =>
            onChange([
              ...value.filter((row) => row.category !== category),
              { category, image: images[0] || '' },
            ])
          }
        />
      )}
    </div>
  );
}
function MediaLibrary({ token }) {
  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">YOUR BRAND IMAGERY</span>
          <h1>Media library.</h1>
          <p>Upload once and reuse images across your store.</p>
        </div>
      </div>
      <div className="panel stack">
        <MediaPicker token={token} manager />
        <p className="muted small">
          Archive hides images and lets you restore them. Under Archived / unfinished uploads,
          Delete permanently removes unused files from Cloudinary and the database. Images
          referenced by products, banners, collections, carts, or past orders are protected.
        </p>
      </div>
    </>
  );
}

function StoreSettingsForm({ initial, token, shipping }) {
  const [form, setForm] = useState(initial);
  const [bannerBusy, setBannerBusy] = useState(false),
    [coverBusy, setCoverBusy] = useState(false);
  const store = useStore();
  const a = useAction(store.refresh);
  const field = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (bannerBusy || coverBusy) return;
        const body = shipping
          ? { shippingRates: form.shippingRates }
          : {
              heroTitle: form.heroTitle,
              heroSubtitle: form.heroSubtitle,
              heroImage: form.heroImage,
              heroAlt: form.heroAlt,
              collectionCovers: form.collectionCovers || [],
              announcement: form.announcement,
              supportEmail: form.supportEmail,
              supportPhone: form.supportPhone,
              whatsapp: form.whatsapp,
            };
        a.run(
          () => apiRequest('/admin/settings', { token, method: 'PUT', body: JSON.stringify(body) }),
          'Settings saved.',
        );
      }}
    >
      {shipping ? (
        <>
          <div className="notice">
            <strong>One shipping fee per order, based on governorate.</strong>
            <p>
              Leave a rate empty to require customer contact. A rate of 0 means free shipping.
              Disabled governorates cannot complete checkout.
            </p>
          </div>
          <div className="shipping-grid">
            {form.shippingRates.map((rate, i) => (
              <div className="panel" key={rate.governorate}>
                <h3>{rate.governorate}</h3>
                <label>
                  Delivery fee (EGP)
                  <input
                    aria-label={rate.governorate + ' delivery fee'}
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    placeholder="Not set"
                    value={rate.fee ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        shippingRates: f.shippingRates.map((r, n) =>
                          n === i
                            ? { ...r, fee: e.target.value === '' ? null : Number(e.target.value) }
                            : r,
                        ),
                      }))
                    }
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={rate.enabled}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        shippingRates: f.shippingRates.map((r, n) =>
                          n === i ? { ...r, enabled: e.target.checked } : r,
                        ),
                      }))
                    }
                  />
                  Delivery enabled
                </label>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="panel stack">
          <h2>Homepage</h2>
          <label>
            Hero heading
            <input
              required
              name="heroTitle"
              maxLength={120}
              value={form.heroTitle}
              onChange={field}
            />
          </label>
          <label>
            Hero description
            <textarea
              name="heroSubtitle"
              maxLength={400}
              value={form.heroSubtitle}
              onChange={field}
            />
          </label>
          <h3>Homepage banner</h3>
          <MediaPicker
            token={token}
            purpose="banner"
            max={1}
            selected={form.heroImage ? [form.heroImage] : []}
            onChange={(images) => setForm((f) => ({ ...f, heroImage: images[0] || '' }))}
            onBusy={setBannerBusy}
          />
          <label>
            Banner image description
            <input name="heroAlt" maxLength={200} value={form.heroAlt || ''} onChange={field} />
          </label>
          <CollectionCoverControls
            token={token}
            value={form.collectionCovers || []}
            onChange={(collectionCovers) => setForm((f) => ({ ...f, collectionCovers }))}
            onBusy={setCoverBusy}
          />
          <label>
            Announcement bar
            <input name="announcement" maxLength={180} value={form.announcement} onChange={field} />
          </label>
          <h2>Customer contact</h2>
          <p className="muted small">
            These appear on the Contact page. Leave any unavailable channel blank.
          </p>
        </div>
      )}
      {!shipping && (
        <div className="panel form-grid">
          <label>
            Support email
            <input type="email" name="supportEmail" value={form.supportEmail} onChange={field} />
          </label>
          <label>
            Support phone
            <input name="supportPhone" value={form.supportPhone} onChange={field} />
          </label>
          <label>
            WhatsApp number with country code
            <input name="whatsapp" value={form.whatsapp} onChange={field} />
          </label>
        </div>
      )}
      <Notice {...a} />
      <button className="btn align-start" disabled={a.busy || bannerBusy || coverBusy}>
        {a.busy ? 'Saving…' : shipping ? 'Save delivery rates' : 'Save store settings'}
      </button>
    </form>
  );
}
function StoreSettings({ token, shipping }) {
  const r = useResource('/admin/settings', token);
  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">{shipping ? 'ACROSS EGYPT' : 'YOUR BRAND, YOUR DETAILS'}</span>
          <h1>{shipping ? 'Delivery rates.' : 'Store settings.'}</h1>
        </div>
      </div>
      <Status {...r} retry={r.refresh} />
      {r.data && (
        <StoreSettingsForm
          key={shipping ? 'shipping' : 'settings'}
          initial={r.data.settings}
          token={token}
          shipping={shipping}
        />
      )}
    </>
  );
}

export default function Admin() {
  const { user, token, loading, error, retryProfile } = useAuth();
  const { pathname } = useLocation();
  const section = pathname.split('/')[2] || 'overview';
  if (loading)
    return (
      <div className="store-page">
        <Status loading />
      </div>
    );
  if (error)
    return (
      <div className="store-page">
        <Status error={error} retry={retryProfile} />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin')
    return (
      <div className="store-page">
        <Empty title="Administrator access required.">
          <Link className="btn" to="/profile">
            My account
          </Link>
        </Empty>
      </div>
    );
  const nav = [
    ['overview', 'Overview', LayoutDashboard],
    ['products', 'Products', Package],
    ['media', 'Media library', Package],
    ['orders', 'Orders', Package],
    ['users', 'Customers', Users],
    ['shipping', 'Delivery', Truck],
    ['support', 'Support inbox', Inbox],
    ['settings', 'Store settings', Settings],
  ];
  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link className="wordmark" to="/">
          MAZHARI<span>STORE MANAGEMENT</span>
        </Link>
        <nav aria-label="Administration">
          {nav.map(([key, title, Icon]) => (
            <NavLink
              end={key === 'overview'}
              to={'/admin' + (key === 'overview' ? '' : '/' + key)}
              key={key}
            >
              <Icon size={18} />
              {title}
            </NavLink>
          ))}
        </nav>
        <AdminOrderBell sidebar />
        <div className="admin-identity">
          <strong>{user.name}</strong>
          <span>Administrator</span>
          <Link to="/profile" className="text-link">
            My account
          </Link>
          <Link to="/" className="text-link">
            View storefront <ArrowUpRight size={14} />
          </Link>
        </div>
      </aside>
      <section id="admin-content" className="admin-content">
        <div className="admin-topbar">
          <Link to="/" className="text-link">
            View storefront <ArrowUpRight size={15} />
          </Link>
          <AdminOrderBell />
        </div>
        {section === 'overview' ? (
          <Overview token={token} />
        ) : section === 'products' ? (
          <Products token={token} />
        ) : section === 'media' ? (
          <MediaLibrary token={token} />
        ) : section === 'orders' ? (
          <Orders token={token} />
        ) : section === 'users' ? (
          <UsersPanel token={token} />
        ) : section === 'support' ? (
          <Support token={token} />
        ) : ['settings', 'shipping'].includes(section) ? (
          <StoreSettings key={section} token={token} shipping={section === 'shipping'} />
        ) : (
          <Empty title="This admin page does not exist." />
        )}
      </section>
    </div>
  );
}
