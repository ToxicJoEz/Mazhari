import { StoreContext } from './store';
import { useResource } from '../lib/store';
export function StoreProvider({ children }) {
  const resource = useResource('/settings');
  return (
    <StoreContext.Provider value={{ ...resource, settings: resource.data?.settings }}>
      {children}
    </StoreContext.Provider>
  );
}
