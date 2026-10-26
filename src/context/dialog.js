import { createContext, useContext } from 'react';
export const DialogContext = createContext(null);
export const useDialog = () => useContext(DialogContext);
