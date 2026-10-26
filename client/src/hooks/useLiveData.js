import { portfolioApi, stocksApi } from '../api/index.js';
import { useApi } from './useApi.js';

// Dashboard and trade pages poll on the same cadence as the market badge so prices visibly move.
export const LIVE_POLL_MS = 15000;

export function useStocks() {
  return useApi(() => stocksApi.list().then((r) => r.stocks), { pollMs: LIVE_POLL_MS });
}

export function usePortfolio() {
  return useApi(portfolioApi.get, { pollMs: LIVE_POLL_MS });
}
