import ContentImage from '../components/ContentImage';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useResource } from '../lib/store';
import { Status, Empty } from '../components/UI';
import PageTransition from '../components/PageTransition';
export default function Collections() {
  const resource = useResource('/products/collections');
  return (
    <PageTransition className="store-page">
      <header className="page-heading">
        <span className="eyebrow">A STUDY IN TEXTURE</span>
        <h1>The collections.</h1>
        <p>Find the silhouette that speaks to you.</p>
      </header>
      <Status {...resource} retry={resource.refresh} />
      <div className="collections-grid">
        {resource.data?.collections.map((category, i) => (
          <Link
            to={'/shop?category=' + encodeURIComponent(category)}
            key={category}
            className="collection-tile"
          >
            <ContentImage
              src={resource.data.covers[category]}
              alt={category}
              placeholder="Collection photo coming soon"
            />
            <div>
              <span className="eyebrow">EDIT {String(i + 1).padStart(2, '0')}</span>
              <h2>
                {category} <ArrowUpRight />
              </h2>
            </div>
          </Link>
        ))}
      </div>
      {!resource.loading && !resource.error && !resource.data?.collections.length && (
        <Empty title="Collections are coming soon." />
      )}
    </PageTransition>
  );
}
