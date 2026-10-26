import { createContext, useContext } from 'react';
export const NotificationsContext = createContext(null);
export const useOrderNotifications = () => useContext(NotificationsContext);
