import React from 'react';
import { Link } from 'react-router-dom';
import { mockProducts } from '../data/mockProducts';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';

const Shop = () => {
  return (
    <PageTransition className="shop-page">
      <div className="shop-header">
        <h1>Outerwear Collection</h1>
        <p>Hand-tailored statement jackets, coats, and blazers.</p>
      </div>

      <div className="shop-controls flex justify-between items-center">
        <div className="results-count">{mockProducts.length} Statement Pieces</div>
        <div className="filters flex gap-4">
          <button>All Jackets</button>
          <button>In Stock</button>
        </div>
      </div>

      <div className="product-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {mockProducts.map((product, index) => (
          <motion.div 
            key={product.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link to={`/product/${product.id}`} className="product-card block">
              <div className="img-container relative overflow-hidden">
                <img 
                  src={product.images[0]} 
                  alt={product.name} 
                  className="img-main absolute inset-0 w-full h-full"
                />
                <img 
                  src={product.images[1] || product.images[0]} 
                  alt={`${product.name} alternate view`} 
                  className="img-hover absolute inset-0 w-full h-full"
                />
                {product.stock <= 3 && (
                  <div className="low-stock-badge absolute z-10">
                    Only {product.stock} Left
                  </div>
                )}
              </div>
              
              <div className="product-info flex flex-col gap-2">
                <div className="title-row flex justify-between items-start">
                  <h3>{product.name}</h3>
                  <span className="price">${product.price}</span>
                </div>
                
                <p className="description">{product.description}</p>
                
                <div className="meta-row flex flex-wrap justify-between items-center gap-2">
                  <span className="colors-badge">
                    Colors: {product.colors.join(' · ')}
                  </span>
                  <span className="shipping-badge">
                    Shipping: ${product.shippingFee}
                  </span>
                </div>
                
                <div className="sizes-row">
                  <span className="sizes-label">Sizes: {product.sizes.join(', ')}</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </PageTransition>
  );
};

export default Shop;
