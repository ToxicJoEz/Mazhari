import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { mockProducts } from '../data/mockProducts';
import { useCart } from '../context/CartContext';
import { ChevronDown, ChevronUp, Truck, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';

const Accordion = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="accordion-item">
      <button 
        className="accordion-header flex justify-between items-center w-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        {title}
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="accordion-content overflow-hidden"
          >
            <div className="accordion-inner">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const product = mockProducts.find(p => p.id === id) || mockProducts[0];
  
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    addToCart(product, selectedSize, selectedColor);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <PageTransition className="product-page">
      <div className="product-layout flex flex-col md:flex-row">
        
        {/* Interactive Image Gallery */}
        <div className="gallery-section w-full md:w-3/5 flex flex-col">
          <div className="main-image-container relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.img 
                key={activeImageIndex}
                src={product.images[activeImageIndex]} 
                alt={`${product.name} - view ${activeImageIndex + 1}`} 
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0.4 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>
          </div>
          
          <div className="thumbs-strip flex gap-3 overflow-x-auto">
            {product.images.map((img, idx) => (
              <button 
                key={idx} 
                onClick={() => setActiveImageIndex(idx)}
                className={`thumb-btn flex-shrink-0 relative overflow-hidden ${activeImageIndex === idx ? 'active' : ''}`}
                aria-label={`View angle ${idx + 1}`}
              >
                <img src={img} alt={`Thumbnail ${idx + 1}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Product Details & Actions */}
        <div className="info-section w-full md:w-2/5">
          <div className="info-sticky md:sticky">
            <h1>{product.name}</h1>
            <p className="price">${product.price}</p>
            
            <p className="description">
              {product.description}
            </p>

            {/* Colors Selector */}
            <div className="color-selector">
              <div className="color-header flex justify-between items-center">
                <span className="label">Color: <strong>{selectedColor}</strong></span>
              </div>
              <div className="color-grid flex flex-wrap gap-2">
                {product.colors.map(color => (
                  <button 
                    key={color} 
                    onClick={() => setSelectedColor(color)}
                    className={`color-btn flex items-center gap-2 ${selectedColor === color ? 'selected' : ''}`}
                  >
                    {selectedColor === color && <Check size={12} />}
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes Selector */}
            <div className="size-selector">
              <div className="size-header flex justify-between items-center">
                <span className="label">Size: <strong>{selectedSize}</strong></span>
                <button className="guide-btn">Size Guide</button>
              </div>
              <div className="size-grid grid grid-cols-5">
                {product.sizes.map(size => (
                  <button 
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`size-btn ${selectedSize === size ? 'selected' : ''}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Shipping Fees Information */}
            <div className="shipping-card flex items-center gap-3">
              <Truck size={20} className="shipping-icon" />
              <div className="shipping-text">
                <span className="fee-highlight">Standard Shipping: ${product.shippingFee}</span>
                <span className="fee-desc">Insured courier dispatch in 1-2 business days with WhatsApp tracking.</span>
              </div>
            </div>

            {/* Scarcity Warning */}
            {product.stock <= 4 && (
              <p className="stock-warning flex items-center">
                <span className="dot block relative overflow-hidden">
                   <span className="dot-inner absolute inset-0 w-full h-full"></span>
                </span>
                Only {product.stock} pieces left in stock
              </p>
            )}

            {/* Add to Cart */}
            <button 
              onClick={handleAddToCart}
              className="add-to-cart-btn w-full"
            >
              {added ? 'Added to Selection ✓' : `Add to Cart · $${product.price}`}
            </button>

            {/* Accordions */}
            <div className="accordions">
              <Accordion title="Materials & Craftsmanship">
                <p><strong>Material:</strong> {product.material}</p>
                <p className="margin-top"><strong>Care Instructions:</strong> {product.care}</p>
              </Accordion>
              <Accordion title="Shipping & Order Processing">
                <p><strong>Shipping Fee:</strong> ${product.shippingFee} flat rate for this item.</p>
                <p className="margin-top">Payments and delivery logistics are finalized directly with our admin concierge via WhatsApp upon request submission.</p>
              </Accordion>
            </div>

          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ProductDetail;
