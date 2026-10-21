import { createContext, useContext } from 'react';
export const CartState = createContext(null);
export const useCart = () => useContext(CartState);
