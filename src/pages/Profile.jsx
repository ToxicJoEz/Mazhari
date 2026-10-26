import { useDialog } from '../context/dialog';
import Select from '../components/Select';
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { LogOut, Package, Settings, UserRound } from 'lucide-react';
import { useAuth } from '../context/auth';
import { apiRequest } from '../lib/api';
import { GOVERNORATES } from '../../shared/constants';
import { Status, Notice } from '../components/UI';
import PageTransition from '../components/PageTransition';
function ProfileForms({ user, token, replaceSession, logout }) {
  const dialog = useDialog();
  const [form, setForm] = useState({
    name: user.name,
    mobile: user.mobile,
    addresses: user.addresses || [],
  });
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const action = async (work, success) => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await work();
      setNotice(success);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const save = (e) => {
    e.preventDefault();
    action(async () => {
      const data = await apiRequest('/users/profile', {
        token,
        method: 'PUT',
        body: JSON.stringify(form),
      });
      replaceSession({ token, user: data.user });
    }, 'Your profile has been saved.');
  };
  const change = (e) => {
    e.preventDefault();
    const formElement = e.currentTarget;
    const data = Object.fromEntries(new FormData(formElement));
    if (data.newPassword !== data.confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    action(async () => {
      const result = await apiRequest('/users/change-password', {
        token,
        method: 'PUT',
        body: JSON.stringify(data),
      });
      replaceSession(result);
      formElement.reset();
    }, 'Password changed. Other sessions have been signed out.');
  };
  const address = (index, key, value) =>
    setForm((f) => ({
      ...f,
      addresses: f.addresses.map((a, i) => (i === index ? { ...a, [key]: value } : a)),
    }));
  return (
    <>
      <div className="profile-navigation">
        <Link to="/orders" className="panel">
          <Package />
          <div>
            <h2>My orders</h2>
            <p>Check delivery progress and order history.</p>
          </div>
        </Link>
        {user.role === 'admin' && (
          <Link to="/admin" className="panel">
            <Settings />
            <div>
              <h2>Admin dashboard</h2>
              <p>Manage your store, stock, orders and customers.</p>
            </div>
          </Link>
        )}
      </div>
      <Notice error={error} notice={notice} />
      <div className="profile-columns">
        <form className="panel stack" onSubmit={save}>
          <h2>
            <UserRound size={20} /> Personal details
          </h2>
          <label>
            Full name
            <input
              required
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Email
            <input disabled value={user.email} />
          </label>
          <label>
            Mobile
            <input
              required
              type="tel"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            />
          </label>
          <h3>Saved addresses</h3>
          <p className="muted small">Your first address is the default. Save up to ten.</p>
          {form.addresses.map((a, i) => (
            <fieldset className="address-editor stack" key={i}>
              <legend>Address {i + 1}</legend>
              <label>
                Governorate
                <Select
                  required
                  value={a.governorate || ''}
                  onChange={(e) => address(i, 'governorate', e.target.value)}
                >
                  <option value="">Choose governorate</option>
                  {GOVERNORATES.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </Select>
              </label>
              <label>
                City / district
                <input
                  required
                  value={a.city}
                  onChange={(e) => address(i, 'city', e.target.value)}
                />
              </label>
              <label>
                Street & apartment
                <input
                  required
                  value={a.street}
                  onChange={(e) => address(i, 'street', e.target.value)}
                />
              </label>
              <label>
                Postal code
                <input value={a.zip || ''} onChange={(e) => address(i, 'zip', e.target.value)} />
              </label>
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  setForm((f) => ({ ...f, addresses: f.addresses.filter((_, n) => n !== i) }))
                }
              >
                Remove address
              </button>
            </fieldset>
          ))}
          {form.addresses.length < 10 && (
            <button
              className="btn secondary"
              type="button"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  addresses: [...f.addresses, { street: '', city: '', governorate: '', zip: '' }],
                }))
              }
            >
              Add address
            </button>
          )}
          <button className="btn" disabled={busy}>
            Save profile
          </button>
        </form>
        <div className="stack">
          <form className="panel stack" onSubmit={change}>
            <h2>Change password</h2>
            <label>
              Current password
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              New password
              <input
                name="newPassword"
                type="password"
                minLength={8}
                maxLength={72}
                required
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm new password
              <input
                name="confirmPassword"
                type="password"
                minLength={8}
                maxLength={72}
                required
                autoComplete="new-password"
              />
            </label>
            <button className="btn secondary" disabled={busy}>
              Update password
            </button>
          </form>
          {user.role !== 'admin' && (
            <form
              className="panel stack danger-zone"
              onSubmit={async (e) => {
                e.preventDefault();
                const password = new FormData(e.currentTarget).get('password');
                if (
                  await dialog.confirm(
                    'Deactivate your account? You can restore it using your credentials.',
                  )
                )
                  action(async () => {
                    await apiRequest('/users/profile', {
                      token,
                      method: 'DELETE',
                      body: JSON.stringify({ password }),
                    });
                    logout();
                  }, 'Account deactivated.');
              }}
            >
              <h3>Deactivate account</h3>
              <p>
                Your order records remain available to the store for fulfilment. You can restore
                your account later.
              </p>
              <label>
                Confirm your password
                <input type="password" name="password" autoComplete="current-password" required />
              </label>
              <button className="btn secondary" disabled={busy}>
                Deactivate my account
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
export default function Profile() {
  const auth = useAuth();
  if (auth.loading)
    return (
      <PageTransition className="store-page">
        <Status loading />
      </PageTransition>
    );
  if (auth.error && auth.token)
    return (
      <PageTransition className="store-page">
        <Status error={auth.error} retry={auth.retryProfile} />
        <button className="btn secondary" onClick={auth.logout}>
          Sign out
        </button>
      </PageTransition>
    );
  if (!auth.user) return <Navigate to="/login" replace />;
  return (
    <PageTransition className="store-page">
      <header className="page-heading compact row between">
        <div>
          <span className="eyebrow">YOUR MAZHARI ACCOUNT</span>
          <h1>Welcome, {auth.user.name.split(' ')[0]}.</h1>
          <p>
            {auth.user.role === 'admin'
              ? 'Administrator'
              : 'Your personal details and orders, in one place.'}
          </p>
        </div>
        <button className="btn secondary" onClick={auth.logout}>
          <LogOut size={16} />
          Sign out
        </button>
      </header>
      <ProfileForms {...auth} />
    </PageTransition>
  );
}
