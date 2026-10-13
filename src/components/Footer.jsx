import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer-container">
      <div className="footer-inner w-full">
        <div className="footer-grid grid grid-cols-1 md:grid-cols-4">
          <div className="brand-section col-span-1 md:col-span-2">
            <h2 className="logo">Mazhari</h2>
            <p className="brand-desc">
              Defining the modern silhouette. Heavyweight fabrics, meticulous cuts, and an uncompromising approach to quality.
            </p>
            <form className="subscribe-form flex">
              <input 
                type="email" 
                placeholder="Join the Atelier (Email Address)" 
                className="flex-grow"
              />
              <button type="submit">Subscribe</button>
            </form>
          </div>
          
          <div className="links-section">
            <h3>Explore</h3>
            <ul className="flex flex-col gap-4">
              <li><Link to="/shop">Shop All</Link></li>
              <li><Link to="/collections">Collections</Link></li>
              <li><Link to="/lookbook">Lookbook</Link></li>
              <li><Link to="/about">Our Story</Link></li>
            </ul>
          </div>

          <div className="links-section">
            <h3>Client Services</h3>
            <ul className="flex flex-col gap-4">
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/shipping">Shipping & Returns</Link></li>
              <li><Link to="/sizing">Size Guide</Link></li>
              <li><Link to="/terms">Terms & Conditions</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom flex flex-col md:flex-row justify-between items-center">
          <p>&copy; 2026 Mazhari. All rights reserved.</p>
          <div className="social-links flex">
            <a href="#">Instagram</a>
            <a href="#">Twitter</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
