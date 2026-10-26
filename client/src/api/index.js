import api from './client.js';

// One function per endpoint; each resolves to the response body.
const data = (request) => request.then((res) => res.data);

export const authApi = {
  register: (payload) => data(api.post('/auth/register', payload)),
  login: (username, password) => data(api.post('/auth/login', { username, password })),
  logout: () => data(api.post('/auth/logout')),
  me: () => data(api.get('/auth/me')),
};

export const marketApi = {
  status: () => data(api.get('/market/status')),
};

export const stocksApi = {
  list: () => data(api.get('/stocks')),
  get: (ticker) => data(api.get(`/stocks/${encodeURIComponent(ticker)}`)),
  history: (ticker, params) => data(api.get(`/stocks/${encodeURIComponent(ticker)}/history`, { params })),
};

export const ordersApi = {
  place: ({ ticker, orderType, quantity }) => data(api.post('/orders', { ticker, orderType, quantity })),
  list: (status) => data(api.get('/orders', { params: status ? { status } : {} })),
  cancel: (orderId) => data(api.delete(`/orders/${orderId}`)),
};

export const portfolioApi = {
  get: () => data(api.get('/portfolio')),
  transactions: (params) => data(api.get('/transactions', { params })),
};

export const cashApi = {
  balance: () => data(api.get('/cash')),
  deposit: (amount) => data(api.post('/cash/deposit', { amount })),
  withdraw: (amount) => data(api.post('/cash/withdraw', { amount })),
};

export const adminApi = {
  listStocks: () => data(api.get('/admin/stocks')),
  createStock: (payload) => data(api.post('/admin/stocks', payload)),
  marketSettings: () => data(api.get('/admin/market')),
  updateHours: (openingTime, closingTime) => data(api.put('/admin/market/hours', { openingTime, closingTime })),
  updateSchedule: (tradingDays, holidays) => data(api.put('/admin/market/schedule', { tradingDays, holidays })),
};
