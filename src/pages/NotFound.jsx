import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div className="store-page">
      <div className="state-panel">
        <span className="eyebrow">404 / A WRONG TURN</span>
        <h1>This page has moved on.</h1>
        <p>Let’s find you something worth discovering.</p>
        <Link className="btn" to="/shop">
          Explore the collection
        </Link>
      </div>
    </div>
  );
}
