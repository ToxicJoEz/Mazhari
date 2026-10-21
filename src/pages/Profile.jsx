import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../context/auth';
import PageTransition from '../components/PageTransition';

export default function Profile() {
  const { user, token, loading, error, logout, retryProfile } = useAuth();
  if (loading) return <PageTransition className="account-page"><p role="status">Loading your account…</p></PageTransition>;
  if (error && token) return <PageTransition className="account-page"><div className="account-card"><h1>Your account</h1><p role="alert" className="account-error">{error}</p><button className="account-primary" onClick={retryProfile}>Try again</button><button className="account-secondary" onClick={logout}>Sign out</button></div></PageTransition>;
  if (!user) return <Navigate to="/login" replace />;
  return <PageTransition className="account-page profile-page">
    <header className="profile-header flex flex-wrap justify-between items-center gap-4">
      <div><span className="account-eyebrow">YOUR MAZHARI ACCOUNT</span><h1>Welcome, {user.name.split(' ')[0]}.</h1><p>A personal space for your details.</p></div>
      <button onClick={logout} className="account-secondary inline-flex items-center gap-2"><LogOut size={16} /> Sign out</button>
    </header>
    <div className="profile-layout grid grid-cols-1 md:grid-cols-2 gap-6">
      <section className="account-card"><h2 className="flex items-center gap-3"><UserRound size={22} /> Personal details</h2><dl className="profile-details">
        <div><dt>Full name</dt><dd>{user.name}</dd></div>
        <div><dt>Email address</dt><dd>{user.email}</dd></div>
        <div><dt>Mobile number</dt><dd>{user.mobile}</dd></div>
        <div><dt>Account type</dt><dd>{user.role === 'admin' ? 'Administrator' : 'Customer'}</dd></div>
      </dl></section>
      <section className="account-card"><h2>Saved addresses</h2>{user.addresses?.length ? <ul className="profile-addresses">{user.addresses.map((address, index) => <li key={address._id || index}><p>{address.street}</p><p>{address.city}{address.zip ? ', ' + address.zip : ''}</p>{address.isDefault && <span className="account-hint">Default address</span>}</li>)}</ul> : <p className="account-description">You have no saved addresses yet.</p>}<Link className="account-shop inline-flex items-center gap-2" to="/shop">Discover the collection <ArrowRight size={16} /></Link></section>
    </div>
  </PageTransition>;
}
