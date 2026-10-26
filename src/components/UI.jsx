import ContentImage from './ContentImage';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, ArrowUpRight } from 'lucide-react';
import { money, productImage } from '../lib/store';
export function Status({ loading, error, retry }) {
  if (loading)
    return (
      <div className="state-panel" role="status">
        <span className="spinner" />
        Loading…
      </div>
    );
  if (error)
    return (
      <div className="state-panel">
        <h2>We couldn’t load this.</h2>
        <p className="error" role="alert">
          {error}
        </p>
        {retry && (
          <button className="btn" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    );
  return null;
}
export function Empty({ title = 'Nothing here yet', children }) {
  return (
    <div className="state-panel">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function Notice({ error, notice }) {
  return (
    <>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
    </>
  );
}
const modalStack = [];
let nextModalLayer = 20000;
export function Modal({ title, onClose, children, drawer = false, className = '' }) {
  const ref = useRef();
  const [layer] = useState(() => (nextModalLayer += 20));
  const closeRef = useRef(onClose);
  const modalId = useRef(Symbol());
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const id = modalId.current;
    modalStack.push(id);
    const previous = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      [
        ...ref.current.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]'),
      ].filter((el) => !el.disabled && el.offsetParent !== null);
    focusable()[0]?.focus();
    const key = (event) => {
      if (modalStack.at(-1) !== id) return;
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'Tab') {
        const list = focusable(),
          first = list[0],
          last = list.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      modalStack.splice(modalStack.indexOf(id), 1);
      document.body.style.overflow = old;
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, []);
  return createPortal(
    <div
      className="modal-backdrop"
      style={{ zIndex: layer }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className={'modal-panel ' + (drawer ? 'drawer-panel ' : '') + className}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="row between">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close dialog" onClick={onClose}>
            <X size={22} />
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}
export function ProductCard({ product }) {
  const stock = product.variants.reduce((n, v) => n + v.stock, 0);
  return (
    <Link className="catalog-card" to={'/product/' + product._id}>
      <div className="catalog-image">
        <ContentImage src={productImage(product)} alt={product.title} loading="lazy" />
        <span className="image-tag">
          {!stock ? 'Sold out' : product.featured ? 'Selected by Mazhari' : product.category}
        </span>
        <span className="card-arrow">
          <ArrowUpRight size={22} />
        </span>
      </div>
      <div className="row between">
        <h3>{product.title}</h3>
        <strong>{money(product.basePrice)}</strong>
      </div>
      <p>{product.colors.join(' / ')}</p>
      <small>{product.sizes.join(' · ')}</small>
    </Link>
  );
}
export function Pager({ page, pages, onChange }) {
  return pages > 1 ? (
    <div className="pager row">
      <button className="btn secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {pages}
      </span>
      <button className="btn secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </div>
  ) : null;
}
