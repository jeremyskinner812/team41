import { useContext } from 'react';
import { MarketStatusContext } from '../context/contexts.js';

// { data: { isOpen, opensAt, closesAt, reason, timezone }, loading, error, reload }
export function useMarketStatus() {
  const ctx = useContext(MarketStatusContext);
  if (!ctx) throw new Error('useMarketStatus must be used inside <MarketStatusProvider>');
  return ctx;
}
