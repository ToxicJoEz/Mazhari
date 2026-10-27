import AdminOrderBell from './AdminOrderBell';
import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ShoppingBag, Menu, X, UserRound } from 'lucide-react';
import { useCart } from '../context/cart';
import { useAuth } from '../context/auth';
import { useStore } from '../context/store';
export default function Navbar() {
  const { totalItems, toggleDrawer } = useCart();
  const { user } = useAuth();
  const { settings } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="announcement">
        {settings?.announcement || 'Cash on delivery · Across Egypt · Prices in EGP'}
      </div>
      <header className="store-nav">
        <div className="nav-wrap">
          <button
            className="icon-btn mobile-only"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <nav className="desktop-links" aria-label="Main navigation">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/shop">Shop</NavLink>
            <NavLink to="/collections">Collections</NavLink>
          </nav>
          <Link to="/" className="wordmark">
            MAZHARI<span>THE OUTERWEAR EDIT</span>
          </Link>
          <div className="nav-actions">
            <AdminOrderBell />
            <Link
              to={user ? '/profile' : '/login'}
              className="icon-btn"
              aria-label={user ? 'My account' : 'Sign in'}
            >
              <UserRound size={20} />
              <span className="desktop-label">{user ? 'My account' : 'Sign in'}</span>
            </Link>
            <button
              className="icon-btn bag-trigger"
              onClick={toggleDrawer}
              aria-label={'Open shopping bag, ' + totalItems + ' items'}
            >
              <ShoppingBag size={21} />
              {totalItems > 0 && <span>{totalItems}</span>}
            </button>
          </div>
        </div>
        {open && (
          <nav className="mobile-nav" aria-label="Mobile navigation" onClick={() => setOpen(false)}>
            <NavLink to="/">Home</NavLink>
            <NavLink to="/shop">Shop all</NavLink>
            <NavLink to="/collections">Collections</NavLink>
            <NavLink to="/track">Track an order</NavLink>
            {['admin', 'moderator'].includes(user?.role) && (
              <NavLink to="/admin">Admin dashboard</NavLink>
            )}
          </nav>
        )}
      </header>
    </>
  );
}
