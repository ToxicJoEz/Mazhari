import { BANNER_IMAGE } from '../../shared/media.js';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, ShieldCheck, Layers } from 'lucide-react';
import { useStore } from '../context/store';
import { useResource } from '../lib/store';
import { ProductCard, Status, Empty } from '../components/UI';
import PageTransition from '../components/PageTransition';
export default function Home() {
  const { settings } = useStore();
  const catalog = useResource('/products?limit=4');
  return (
    <PageTransition>
      <section className="store-hero">
        <img
          src={settings?.heroImage || BANNER_IMAGE}
          alt="Mazhari outerwear collection"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = BANNER_IMAGE;
          }}
        />
        <div className="hero-copy">
          <span className="eyebrow">MAZHARI / THE OUTERWEAR EDIT</span>
          <h1>{settings?.heroTitle || 'A different kind of statement.'}</h1>
          <p>
            {settings?.heroSubtitle ||
              'Considered silhouettes. Distinctive textures. Discover the Mazhari outerwear collection.'}
          </p>
          <Link to="/shop" className="btn">
            Explore the collection <ArrowRight size={18} />
          </Link>
          <span className="hero-footnote">DESIGNED TO STAND APART.</span>
        </div>
        <span className="hero-index">01 / THE SIGNATURE EDIT</span>
      </section>
      <div className="service-strip">
        <span>
          <Truck size={18} />
          Delivery across Egypt
        </span>
        <span>
          <ShieldCheck size={18} />
          Cash on delivery
        </span>
        <span>
          <Layers size={18} />
          Choose your size & color
        </span>
      </div>
      <section className="store-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE CURRENT SELECTION</span>
            <h2>Pieces with presence.</h2>
          </div>
          <Link to="/shop" className="text-link">
            Shop all <ArrowRight size={16} />
          </Link>
        </div>
        <Status {...catalog} retry={catalog.refresh} />
        {catalog.data?.products.length > 0 ? (
          <div className="catalog-grid">
            {catalog.data.products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        ) : (
          !catalog.loading &&
          !catalog.error && (
            <Empty title="A new collection is taking shape.">
              <p>Our latest pieces will appear here soon.</p>
            </Empty>
          )
        )}
      </section>
      <section className="brand-note">
        <span className="eyebrow">LESS ORDINARY. MORE YOU.</span>
        <h2>
          Texture. Shape.
          <br />
          <em>A point of view.</em>
        </h2>
        <p>
          Mazhari brings distinctive outerwear into everyday life. Explore the details, find your
          fit, and make the silhouette your own.
        </p>
        <Link to="/about" className="text-link">
          Meet Mazhari <ArrowRight size={16} />
        </Link>
      </section>
    </PageTransition>
  );
}
