import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
const year = new Date().getFullYear();
export default function Footer() {
  return (
    <footer className="store-footer">
      <div className="footer-top">
        <div>
          <Link to="/" className="wordmark">
            MAZHARI
          </Link>
          <p>
            Considered silhouettes.
            <br />A distinctive point of view.
          </p>
        </div>
        <div>
          <h3>Explore</h3>
          <Link to="/shop">
            Shop all <ArrowUpRight size={14} />
          </Link>
          <Link to="/collections">Collections</Link>
          <Link to="/about">Our story</Link>
        </div>
        <div>
          <h3>Here to help</h3>
          <Link to="/contact">Contact us</Link>
          <Link to="/shipping">Delivery & store policy</Link>
          <Link to="/size-guide">Size guide</Link>
          <Link to="/track">Track a guest order</Link>
        </div>
        <div>
          <h3>Your account</h3>
          <Link to="/profile">My account</Link>
          <Link to="/orders">My orders</Link>
          <Link to="/forgot-password">Password support</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {year} Mazhari. All prices in EGP.</span>
        <div>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
