import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingBag, Truck, ArrowLeft } from 'lucide-react';
import { useResource, money } from '../lib/store';
import { useCart } from '../context/cart';
import { Status, Notice } from '../components/UI';
import PageTransition from '../components/PageTransition';
function Product({ product }) {
  const [color, setColor] = useState(product.colors[0]);
  const [size, setSize] = useState(
    product.variants.find((v) => v.color === product.colors[0])?.size || '',
  );
  const [image, setImage] = useState(0);
  const cart = useCart();
  const variant = product.variants.find((v) => v.color === color && v.size === size);
  const selectColor = (value) => {
    setColor(value);
    if (!product.variants.some((v) => v.color === value && v.size === size))
      setSize(product.variants.find((v) => v.color === value)?.size || '');
  };
  return (
    <>
      <Link
        className="text-link muted"
        to={'/shop?category=' + encodeURIComponent(product.category)}
      >
        <ArrowLeft size={15} /> {product.category}
      </Link>
      <div className="detail-layout">
        <div>
          <div className="detail-image">
            <img
              src={product.images[image] || '/images/product.svg'}
              alt={product.title + ' / image ' + (image + 1)}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/images/product.svg';
              }}
            />
          </div>
          {product.images.length > 1 && (
            <div className="thumbnails">
              {product.images.map((src, i) => (
                <button
                  key={src + i}
                  aria-label={'View image ' + (i + 1)}
                  aria-pressed={image === i}
                  onClick={() => setImage(i)}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <section className="detail-copy">
          <span className="eyebrow">{product.category}</span>
          <h1>{product.title}</h1>
          <p className="detail-price">{money(product.basePrice)}</p>
          <p className="detail-description">{product.description}</p>
          <fieldset>
            <legend>
              Color <span>{color}</span>
            </legend>
            <div className="option-group">
              {product.colors.map((c) => (
                <button
                  className={color === c ? 'selected' : ''}
                  aria-pressed={color === c}
                  key={c}
                  onClick={() => selectColor(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>
              Size{' '}
              <Link className="text-link" to="/size-guide">
                Size guide
              </Link>
            </legend>
            <div className="option-group">
              {product.sizes.map((s) => {
                const found = product.variants.find((v) => v.color === color && v.size === s);
                return (
                  <button
                    key={s}
                    className={size === s ? 'selected' : ''}
                    aria-pressed={size === s}
                    disabled={!found}
                    onClick={() => setSize(s)}
                  >
                    {s}
                    {found?.stock === 0 ? ' · sold out' : ''}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <p className={variant?.stock ? 'stock-status' : 'error'}>
            {variant?.stock
              ? variant.stock <= 3
                ? 'Only ' + variant.stock + ' left in this selection.'
                : 'Available in your selection.'
              : 'This selection is sold out.'}
          </p>
          <button
            className="btn wide"
            disabled={!variant?.stock || cart.pending || !cart.ready}
            onClick={() => cart.addToCart(product, size, color)}
          >
            <ShoppingBag size={18} />
            {cart.pending ? 'Updating bag…' : 'Add to bag'}
          </button>
          <Notice error={cart.error} notice={cart.notice} />
          {!cart.ready && (
            <button className="text-link" onClick={cart.retryCart}>
              Reload your bag
            </button>
          )}
          <div className="detail-delivery">
            <Truck size={20} />
            <p>
              Cash on delivery across Egypt.
              <br />
              <span>Shipping rate shown at checkout for your governorate.</span>
            </p>
          </div>
          <details open>
            <summary>Details & material</summary>
            <p>{product.material || 'See the product description for material details.'}</p>
          </details>
          <details>
            <summary>Care</summary>
            <p>
              {product.care || 'Follow the care label on your piece. Contact us if you need help.'}
            </p>
          </details>
          <details>
            <summary>Delivery & store policy</summary>
            <p>
              Our team confirms your order before dispatch. Pay the displayed total in cash on
              delivery. All sales are final, subject to applicable rights. Contact us about
              incorrect or damaged items.
            </p>
            <Link className="text-link" to="/shipping">
              Read delivery information
            </Link>
          </details>
        </section>
      </div>
    </>
  );
}
export default function ProductDetail() {
  const { id } = useParams();
  const resource = useResource('/products/' + id);
  return (
    <PageTransition className="store-page product-view">
      <Status {...resource} retry={resource.refresh} />
      {resource.data && <Product key={resource.data.product._id} product={resource.data.product} />}
    </PageTransition>
  );
}
