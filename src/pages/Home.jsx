import React from 'react';
import { Link } from 'react-router-dom';
import { mockProducts, bannerImg } from '../data/mockProducts';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';

const Home = () => {
  const featured = mockProducts.slice(0, 2);

  return (
    <PageTransition className="home-page">
      {/* Hero Section with Custom Editorial Banner */}
      <section className="hero-section relative w-full flex items-center justify-center overflow-hidden">
        <div className="hero-overlay absolute inset-0 z-10" />
        <img 
          src={bannerImg} 
          alt="Mazhari Editorial Banner" 
          className="hero-img absolute inset-0 w-full h-full"
        />
        <div className="hero-content relative z-20">
          <motion.h1 
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            Core Outerwear
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          >
            Tactile luxury tailored for the modern uniform. Precision cuts in suede, leather, fur, and double-faced wool.
          </motion.p>
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          >
            <Link to="/shop" className="hero-btn">
              Explore Collection
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="featured-section">
        <div className="section-header flex justify-between items-end">
          <h2>Featured Outerwear</h2>
          <Link to="/shop" className="view-all hidden md:block">
            View All Jackets
          </Link>
        </div>
        
        <div className="product-grid grid grid-cols-1 md:grid-cols-2">
          {featured.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: idx * 0.15, ease: [0.16, 1, 0.3, 1] }}
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
        <div className="mobile-view-all md:hidden">
          <Link to="/shop" className="view-all">
            View All Jackets
          </Link>
        </div>
      </section>

      {/* Brand Ethos */}
      <section className="ethos-section">
        <motion.div 
          className="ethos-inner"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2>The Mazhari Atelier</h2>
          <p>
            Every jacket is handcrafted with obsessive dedication to structural drape and material integrity. From raw lambskin to dense shearling-grade faux fur, our silhouettes are designed to transcend transient seasons.
          </p>
        </motion.div>
      </section>
    </PageTransition>
  );
};

export default Home;
