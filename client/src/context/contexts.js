import { createContext } from 'react';

// Context objects live apart from their providers so React Fast Refresh can hot-swap the providers.
export const AuthContext = createContext(null);
export const MarketStatusContext = createContext(null);
