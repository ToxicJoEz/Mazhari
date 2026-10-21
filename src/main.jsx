import '@fontsource-variable/manrope';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { MotionConfig } from 'framer-motion';
import { StoreProvider } from './context/StoreContext';
import { AuthProvider } from './context/AuthContext.jsx';
import './styles/tailwind.css';
import './styles/global.scss';
import { CartProvider } from './context/CartContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <AuthProvider>
          <CartProvider>
            <MotionConfig reducedMotion="user">
              <App />
            </MotionConfig>
          </CartProvider>
        </AuthProvider>
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
