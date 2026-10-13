import React from 'react';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { AnimatePresence, motion } from 'framer-motion';

const CartDrawer = () => {
  const { isDrawerOpen, closeDrawer, cartItems, updateQuantity, removeFromCart, subtotal, totalShipping } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    closeDrawer();
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="cart-overlay fixed inset-0 z-40"
            onClick={closeDrawer}
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="cart-drawer fixed top-0 right-0 h-full w-full md:w-[420px] z-50 flex flex-col"
          >
            <div className="cart-header flex justify-between items-center">
              <h2>Your Selection</h2>
              <button onClick={closeDrawer} className="close-btn" aria-label="Close cart">
                <X size={22} />
              </button>
            </div>

            <div className="cart-body flex-grow overflow-y-auto flex flex-col gap-6">
              {cartItems.length === 0 ? (
                <div className="empty-cart h-full flex flex-col items-center justify-center gap-4">
                  <ShoppingBag size={48} strokeWidth={1} />
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={`${item.id}-${item.size}-${item.color}`} className="cart-item flex gap-4">
                    <img src={item.images[0]} alt={item.name} className="item-img" />
                    <div className="item-details flex flex-col justify-between flex-grow">
                      <div>
                        <h3>{item.name}</h3>
                        <p className="item-variant">Color: {item.color} · Size: {item.size}</p>
                        <p className="item-shipping">Shipping: ${item.shippingFee}</p>
                        <p className="item-price">${item.price}</p>
                      </div>
                      <div className="item-actions flex justify-between items-end">
                        <div className="qty-controls flex items-center">
                          <button onClick={() => updateQuantity(item.id, item.size, item.color, item.quantity - 1)}>
                            <Minus size={14} />
                          </button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.size, item.color, item.quantity + 1)}>
                            <Plus size={14} />
                          </button>
                        </div>
                        <button onClick={() => removeFromCart(item.id, item.size, item.color)} className="remove-btn">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="cart-footer">
                <div className="subtotal flex justify-between items-center">
                  <span className="label">Item Subtotal</span>
                  <span className="value">${subtotal}</span>
                </div>
                <div className="shipping-row flex justify-between items-center">
                  <span className="label">Est. Shipping</span>
                  <span className="value">${totalShipping}</span>
                </div>
                <p className="shipping-note">Payment is collected by our concierge via WhatsApp.</p>
                <button onClick={handleCheckout} className="checkout-btn w-full">
                  Proceed to Request · ${subtotal + totalShipping}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
