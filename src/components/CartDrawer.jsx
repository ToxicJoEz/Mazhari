import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/cart';
import { useAuth } from '../context/auth';
import { Modal, Notice } from './UI';
import { money } from '../lib/store';
export default function CartDrawer() {
  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!cart.isDrawerOpen) return null;
  return (
    <Modal title={'Your bag (' + cart.totalItems + ')'} onClose={cart.closeDrawer} drawer>
      <Notice error={cart.error} notice={cart.notice} />
      {!cart.ready && (
        <button className="btn secondary" onClick={cart.retryCart}>
          Reload bag
        </button>
      )}
      <div className="bag-items">
        {!cart.cartItems.length ? (
          <div className="state-panel">
            <ShoppingBag size={40} />
            <h3>A little room for something good.</h3>
            <Link to="/shop" onClick={cart.closeDrawer} className="text-link">
              Discover the collection
            </Link>
          </div>
        ) : (
          cart.cartItems.map((i) => (
            <article className="bag-item" key={i.id + i.size + i.color}>
              <img src={i.images[0]} alt={i.name} />
              <div>
                <Link to={'/product/' + i.id} onClick={cart.closeDrawer}>
                  {i.name}
                </Link>
                <p>
                  {i.color} / {i.size}
                </p>
                <strong>{money(i.price)}</strong>
                <div className="row between">
                  <div className="quantity">
                    <button
                      aria-label={'Decrease quantity of ' + i.name}
                      disabled={cart.pending || !cart.ready || i.quantity <= 1}
                      onClick={() => cart.updateQuantity(i.id, i.size, i.color, i.quantity - 1)}
                    >
                      <Minus size={14} />
                    </button>
                    <span>{i.quantity}</span>
                    <button
                      aria-label={'Increase quantity of ' + i.name}
                      disabled={
                        cart.pending ||
                        !cart.ready ||
                        i.quantity >= Math.min(i.availableStock || 50, 50)
                      }
                      onClick={() => cart.updateQuantity(i.id, i.size, i.color, i.quantity + 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    className="text-link muted"
                    disabled={cart.pending || !cart.ready}
                    onClick={() => cart.removeFromCart(i.id, i.size, i.color)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
      {cart.cartItems.length > 0 && (
        <div className="bag-bottom">
          <div className="row between">
            <span>Subtotal</span>
            <strong>{money(cart.subtotal)}</strong>
          </div>
          <p className="muted">
            Shipping calculated for your governorate at checkout. Pay cash on delivery.
          </p>
          {!user && (
            <p className="muted">
              <Link to="/login?next=/checkout" onClick={cart.closeDrawer} className="text-link">
                Sign in
              </Link>{' '}
              or create an account to save your bag.
            </p>
          )}
          <button
            className="btn wide"
            disabled={cart.pending || !cart.ready}
            onClick={() => {
              cart.closeDrawer();
              navigate('/checkout');
            }}
          >
            Continue to checkout
          </button>
        </div>
      )}
    </Modal>
  );
}
