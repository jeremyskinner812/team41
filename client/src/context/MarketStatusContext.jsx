import { marketApi } from '../api/index.js';
import { useApi } from '../hooks/useApi.js';
import { MarketStatusContext } from './contexts.js';

export const MARKET_POLL_MS = 15000;

// One shared poll of /api/market/status for every authenticated page (badge, trade, dashboard).
export function MarketStatusProvider({ children }) {
  const market = useApi(marketApi.status, { pollMs: MARKET_POLL_MS });
  return <MarketStatusContext.Provider value={market}>{children}</MarketStatusContext.Provider>;
}
