import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { apiRequest } from '../lib/api';
import { Notice } from '../components/UI';
import PageTransition from '../components/PageTransition';
export default function Recovery({ restore = false }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const { replaceSession } = useAuth();
  const navigate = useNavigate();
  async function submit(e) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await apiRequest(restore ? '/users/restore' : '/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (restore) {
        replaceSession(data);
        navigate('/profile', { replace: true });
      } else setNotice(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <PageTransition className="store-page narrow">
      <header className="page-heading compact">
        <span className="eyebrow">ACCOUNT SUPPORT</span>
        <h1>{restore ? 'Welcome back.' : 'Let’s get you back in.'}</h1>
        <p>
          {restore
            ? 'Reactivate a deleted account with your existing email and password.'
            : 'Our team manually verifies password reset requests using your registered contact details. No reset email is sent.'}
        </p>
      </header>
      <form className="panel stack" onSubmit={submit}>
        {restore ? (
          <>
            <label>
              Email
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label>
              Password
              <input name="password" type="password" required autoComplete="current-password" />
            </label>
          </>
        ) : (
          <label>
            Registered email or mobile number
            <input name="identifier" required maxLength={254} />
          </label>
        )}
        <Notice error={error} notice={notice} />
        <button className="btn" disabled={busy}>
          {busy ? 'Please wait…' : restore ? 'Restore account' : 'Request password help'}
        </button>
        <Link className="text-link" to="/login">
          Back to sign in
        </Link>
      </form>
    </PageTransition>
  );
}
