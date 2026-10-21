import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/auth';
import PageTransition from '../components/PageTransition';

export default function Account({ mode = 'login' }) {
  const { user, loading, authenticate } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') === '/checkout' ? '/checkout' : '/profile';
  const register = mode === 'register';
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user && !loading) return <Navigate to={next} replace />;
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await authenticate(mode, fields);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageTransition className="account-page">
      <div className="account-layout grid grid-cols-1 md:grid-cols-2">
        <section className="account-intro flex flex-col justify-center">
          <span className="account-eyebrow">THE MAZHARI ACCOUNT</span>
          <h1>
            {register ? 'Your next chapter, beautifully tailored.' : 'Welcome back to Mazhari.'}
          </h1>
          <p>
            {register
              ? 'Create your personal account and keep your details close for every piece you discover.'
              : 'Sign in to find your personal details, ready for your next visit.'}
          </p>
          <Link to="/shop" className="account-shop inline-flex items-center gap-2">
            Explore the collection <ArrowRight size={16} />
          </Link>
        </section>
        <section className="account-card" aria-labelledby="account-heading">
          <h2 id="account-heading">{register ? 'Create an account' : 'Sign in'}</h2>
          <p className="account-description">
            {register
              ? 'A few details to make it yours.'
              : 'Enter your email and password to continue.'}
          </p>
          <form onSubmit={submit} className="flex flex-col gap-5">
            {register && (
              <label>
                Full name
                <input name="name" autoComplete="name" required maxLength={100} />
              </label>
            )}
            <label>
              Email address
              <input name="email" type="email" autoComplete="email" required maxLength={254} />
            </label>
            {register && (
              <label>
                Mobile number
                <input
                  name="mobile"
                  type="tel"
                  autoComplete="tel"
                  required
                  minLength={7}
                  placeholder="e.g. +20 100 000 0000"
                  maxLength={25}
                />
              </label>
            )}
            <label>
              Password
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={register ? 'new-password' : 'current-password'}
                required
                minLength={register ? 8 : undefined}
                maxLength={72}
                aria-describedby={register ? 'password-hint' : undefined}
              />
            </label>
            {register && (
              <p id="password-hint" className="account-hint">
                Use at least 8 characters, up to 72 bytes.
              </p>
            )}
            <label className="account-password-toggle flex items-center gap-2">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
              />
              Show password
            </label>
            {error && (
              <p className="account-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="account-primary flex justify-center items-center gap-2"
              disabled={busy}
              type="submit"
            >
              {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
              {!busy && <ArrowRight size={16} />}
            </button>
          </form>
          <p className="account-switch">
            {register ? 'Already have an account?' : 'New to Mazhari?'}{' '}
            <Link
              to={
                (register ? '/login' : '/register') +
                (next === '/checkout' ? '?next=/checkout' : '')
              }
            >
              {register ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
          {!register && (
            <div className="account-switch">
              <Link to="/forgot-password">Forgot password?</Link>
              <Link to="/restore-account">Restore account</Link>
            </div>
          )}
          <p className="account-security flex items-center gap-2">
            <ShieldCheck size={16} /> Your details, securely kept.
          </p>
        </section>
      </div>
    </PageTransition>
  );
}
