import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const { totalItems, toggleDrawer } = useCart();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);



  return (
    <nav className={`navbar fixed w-full top-0 left-0 z-50 ${isScrolled || !isHomePage ? 'scrolled' : 'transparent'}`}>
      <div className="nav-container w-full">
        <div className="nav-inner grid grid-cols-3 items-center w-full">
          
          {/* Left Navigation Links */}
          <div className="nav-left flex items-center justify-start gap-6">
            <button 
              className="menu-btn block md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="nav-links hidden md:flex gap-8">
              <NavLink to="/" end className="nav-link">Home</NavLink>
              <NavLink to="/shop" className="nav-link">Shop</NavLink>
              <NavLink to="/collections" className="nav-link">Collections</NavLink>
            </div>
          </div>

          {/* Centered Logo */}
          <div className="nav-center flex items-center justify-center">
            <Link to="/" className="logo">Mazhari</Link>
          </div>

          {/* Right Action Buttons */}
          <div className="nav-right flex items-center justify-end gap-6">
            <button className="auth-btn hidden md:block">
              Login / Register
            </button>
            <button 
              className="cart-btn relative flex items-center justify-center" 
              onClick={toggleDrawer}
              aria-label="Shopping Cart"
            >
              <ShoppingBag size={20} />
              <AnimatePresence>
                {totalItems > 0 && (
                  <motion.span 
                    key={totalItems}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="badge absolute flex items-center justify-center"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="mobile-menu md:hidden flex flex-col gap-4 overflow-hidden"
          >
            <NavLink to="/" end className="mobile-link" onClick={() => setIsMobileMenuOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/shop" className="mobile-link" onClick={() => setIsMobileMenuOpen(false)}>
              Shop
            </NavLink>
            <NavLink to="/collections" className="mobile-link" onClick={() => setIsMobileMenuOpen(false)}>
              Collections
            </NavLink>
            <div className="mobile-divider w-full" />
            <button className="mobile-auth-btn w-full">
              Login / Register
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
