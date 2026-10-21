import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { useResource } from '../lib/store';
import { ProductCard, Status, Empty, Pager } from '../components/UI';
import PageTransition from '../components/PageTransition';
export default function Shop() {
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const result = useResource('/products?limit=12&' + query);
  const filters = useResource('/products/collections');
  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };
  return (
    <PageTransition className="store-page">
      <header className="page-heading">
        <span className="eyebrow">FIND YOUR NEXT SIGNATURE</span>
        <h1>{params.get('category') || 'The collection.'}</h1>
        <p>Outerwear with a distinct point of view. All prices in EGP.</p>
      </header>
      <div className="catalog-layout">
        <aside className="filter-panel">
          <h2>
            <SlidersHorizontal size={18} /> Refine your edit
          </h2>
          <label>
            Search
            <input
              key={params.get('search') || ''}
              type="search"
              placeholder="Search pieces…"
              defaultValue={params.get('search') || ''}
              onKeyDown={(e) => {
                if (e.key === 'Enter') set('search', e.currentTarget.value);
              }}
              onBlur={(e) => {
                if (e.currentTarget.value !== (params.get('search') || ''))
                  set('search', e.currentTarget.value);
              }}
            />
          </label>
          {[
            ['category', 'Collection', 'collections'],
            ['color', 'Color', 'colors'],
            ['size', 'Size', 'sizes'],
          ].map(([key, title, source]) => (
            <label key={key}>
              {title}
              <select value={params.get(key) || ''} onChange={(e) => set(key, e.target.value)}>
                <option value="">All {title.toLowerCase()}s</option>
                {filters.data?.[source]?.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          ))}
          <div className="form-grid">
            <label>
              Min EGP
              <input
                type="number"
                min="0"
                defaultValue={params.get('minPrice') || ''}
                onBlur={(e) => set('minPrice', e.target.value)}
              />
            </label>
            <label>
              Max EGP
              <input
                type="number"
                min="0"
                defaultValue={params.get('maxPrice') || ''}
                onBlur={(e) => set('maxPrice', e.target.value)}
              />
            </label>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={params.get('inStock') === 'true'}
              onChange={(e) => set('inStock', e.target.checked ? 'true' : '')}
            />
            In stock only
          </label>
          {query && (
            <button className="text-link" onClick={() => setParams({})}>
              <X size={14} /> Clear filters
            </button>
          )}
        </aside>
        <div>
          <div className="catalog-toolbar row between">
            <span>{result.data?.total || 0} pieces</span>
            <label className="sort-label">
              Sort
              <select
                value={params.get('sort') || ''}
                onChange={(e) => set('sort', e.target.value)}
              >
                <option value="">Featured</option>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>
            </label>
          </div>
          <Status {...result} retry={result.refresh} />
          {result.data?.products.length > 0 ? (
            <>
              <div className="catalog-grid shop-grid">
                {result.data.products.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>
              <Pager
                page={Number(params.get('page')) || 1}
                pages={result.data.pages}
                onChange={(n) => set('page', String(n))}
              />
            </>
          ) : (
            !result.loading &&
            !result.error && (
              <Empty title="No pieces match this edit.">
                <p>Try another color, size, or collection.</p>
                <button className="btn secondary" onClick={() => setParams({})}>
                  Clear filters
                </button>
              </Empty>
            )
          )}
        </div>
      </div>
    </PageTransition>
  );
}
