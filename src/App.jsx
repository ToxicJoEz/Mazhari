import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import Collections from './pages/Collections';
const Admin = lazy(() => import('./pages/Admin'));
import NotFound from './pages/NotFound';
import Account from './pages/Account';
import Profile from './pages/Profile';
import { MyOrders, OrderDetail, TrackOrder } from './pages/Orders';
import Recovery from './pages/Recovery';
import Info from './pages/Info';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="app-container relative flex flex-col min-h-screen">
      <ScrollToTop />
      {!isAdmin && <Navbar />}
      {!isAdmin && <CartDrawer />}

      <main id="main-content" className="flex-grow">
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/login" element={<Account key="login" mode="login" />} />
            <Route path="/register" element={<Account key="register" mode="register" />} />
            <Route path="/orders" element={<MyOrders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/track" element={<TrackOrder />} />
            <Route path="/forgot-password" element={<Recovery />} />
            <Route path="/restore-account" element={<Recovery restore />} />
            {['about', 'contact', 'shipping', 'size-guide', 'terms', 'privacy'].map((page) => (
              <Route key={page} path={'/' + page} element={<Info page={page} />} />
            ))}
            <Route path="/profile" element={<Profile />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route
              path="/admin/*"
              element={
                <Suspense
                  fallback={
                    <div className="store-page" role="status">
                      Loading store management…
                    </div>
                  }
                >
                  <Admin />
                </Suspense>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </main>

      {!isAdmin && <Footer />}
    </div>
  );
}

export default App;
