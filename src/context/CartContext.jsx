import React, { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const addToCart = (product, selectedSize, selectedColor) => {
    const color = selectedColor || (product.colors && product.colors[0]) || 'Standard';
    const size = selectedSize || (product.sizes && product.sizes[0]) || 'M';

    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id && item.size === size && item.color === color);
      if (existing) {
        return prev.map(item => 
          item.id === product.id && item.size === size && item.color === color
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { 
        ...product, 
        size, 
        color, 
        shippingFee: product.shippingFee || 15,
        quantity: 1 
      }];
    });
    setIsDrawerOpen(true);
  };

  const removeFromCart = (id, size, color) => {
    setCartItems(prev => prev.filter(item => !(item.id === id && item.size === size && item.color === color)));
  };

  const updateQuantity = (id, size, color, newQty) => {
    if (newQty < 1) return;
    setCartItems(prev => prev.map(item => 
      item.id === id && item.size === size && item.color === color ? { ...item, quantity: newQty } : item
    ));
  };

  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);
  const closeDrawer = () => setIsDrawerOpen(false);

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalShipping = cartItems.reduce((acc, item) => acc + (item.shippingFee * item.quantity), 0);
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      isDrawerOpen,
      toggleDrawer,
      closeDrawer,
      subtotal,
      totalShipping,
      totalItems
    }}>
      {children}
    </CartContext.Provider>
  );
};
