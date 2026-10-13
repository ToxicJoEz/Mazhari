import React from 'react';
import { Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';

const NotFound = () => {
  return (
    <PageTransition className="notfound-page flex flex-col items-center justify-center w-full h-screen">
      <h1>404</h1>
      <p>The piece or page you are looking for does not exist.</p>
      <Link to="/" className="home-btn">Return to Home</Link>
    </PageTransition>
  );
};

export default NotFound;
