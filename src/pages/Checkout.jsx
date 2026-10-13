import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';

const Checkout = () => {
  const { cartItems, subtotal, totalShipping } = useCart();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    whatsapp: '',
    address: '',
    city: '',
    zip: '',
    notes: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  if (cartItems.length === 0 && !isSubmitted) {
    return (
      <PageTransition className="checkout-empty flex flex-col items-center justify-center">
        <h1>Your Cart is Empty</h1>
        <Link to="/shop" className="return-link">Return to Collection</Link>
      </PageTransition>
    );
  }

  const grandTotal = subtotal + totalShipping;

  return (
    <PageTransition className="checkout-page">
      <AnimatePresence mode="wait">
        {isSubmitted ? (
          <motion.div 
            key="success"
            className="checkout-success flex flex-col items-center justify-center"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1>Order Request Confirmed</h1>
            <p>
              Thank you, {formData.firstName}. We have received your piece reservation. Our concierge team will reach out directly to your WhatsApp at {formData.whatsapp} to confirm shipping logistics and arrange manual payment.
            </p>
            <Link to="/" className="home-btn">Return to Home</Link>
          </motion.div>
        ) : (
          <motion.div 
            key="form"
            className="checkout-layout flex flex-col lg:flex-row"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* Form Section */}
            <div className="form-section w-full lg:w-3/5">
              <h1>Direct Order Reservation</h1>
              <p className="intro-text">
                Submit your reservation details below. Online card payments are not charged; our team will personally contact you via WhatsApp to finalize your order.
              </p>

              <form onSubmit={handleSubmit}>
                <h2 className="section-title">Client Details</h2>
                <div className="input-group grid grid-cols-1 md:grid-cols-2">
                  <div className="input-field">
                    <label>First Name</label>
                    <input required type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full" />
                  </div>
                  <div className="input-field">
                    <label>Last Name</label>
                    <input required type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full" />
                  </div>
                </div>
                
                <div className="input-field">
                  <label>WhatsApp Phone Number (For order verification)</label>
                  <input required type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="w-full" placeholder="+1 (555) 000-0000" />
                </div>

                <h2 className="section-title margin-top">Delivery Address</h2>
                <div className="input-field">
                  <label>Street Address</label>
                  <input required type="text" name="address" value={formData.address} onChange={handleChange} className="w-full" />
                </div>
                <div className="input-group grid grid-cols-1 md:grid-cols-2">
                  <div className="input-field">
                    <label>City</label>
                    <input required type="text" name="city" value={formData.city} onChange={handleChange} className="w-full" />
                  </div>
                  <div className="input-field">
                    <label>Postal / Zip Code</label>
                    <input required type="text" name="zip" value={formData.zip} onChange={handleChange} className="w-full" />
                  </div>
                </div>

                <h2 className="section-title margin-top">Special Requests / Notes</h2>
                <div className="input-field">
                  <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" className="w-full" placeholder="Fitting notes, gift packaging, or delivery preferences"></textarea>
                </div>

                <button type="submit" className="submit-btn w-full">
                  Submit Reservation Request · ${grandTotal}
                </button>
              </form>
            </div>

            {/* Order Summary */}
            <div className="summary-section w-full lg:w-2/5">
              <div className="summary-sticky lg:sticky">
                <h2>Reserved Items</h2>
                <div className="summary-items">
                  {cartItems.map((item) => (
                    <div key={`${item.id}-${item.size}-${item.color}`} className="summary-item flex">
                      <img src={item.images[0]} alt={item.name} />
                      <div className="item-details flex-grow flex flex-col justify-center">
                        <div className="item-header flex justify-between">
                          <h3>{item.name}</h3>
                          <span>${item.price * item.quantity}</span>
                        </div>
                        <p className="item-meta">
                          {item.color} · Size: {item.size} · Qty: {item.quantity}
                        </p>
                        <p className="item-shipping-sub">
                          Shipping: ${item.shippingFee * item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="summary-totals">
                  <div className="total-row flex justify-between">
                    <span className="label">Item Subtotal</span>
                    <span className="value">${subtotal}</span>
                  </div>
                  <div className="total-row flex justify-between">
                    <span className="label">Insured Shipping</span>
                    <span className="value">${totalShipping}</span>
                  </div>
                  <div className="grand-total flex justify-between items-end">
                    <span className="label">Estimated Total</span>
                    <span className="value">${grandTotal}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};

export default Checkout;
