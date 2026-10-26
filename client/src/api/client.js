import axios from 'axios';

// The one HTTP client for the app. withCredentials sends the httpOnly session cookie to the API.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  withCredentials: true,
  timeout: 15000,
});

export default api;

// The API's own message ({ error: { code, message } }), so users see why a request failed.
export function errorMessage(err) {
  const apiMessage = err?.response?.data?.error?.message;
  if (apiMessage) return apiMessage;
  if (err?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (err?.request && !err.response) return 'Cannot reach the EZ Trader server. Is the API running?';
  return err?.message ?? 'Something went wrong.';
}

export function errorCode(err) {
  return err?.response?.data?.error?.code ?? null;
}

// Validation errors carry per-field details; map them to { fieldName: message } for forms.
export function fieldErrors(err) {
  const details = err?.response?.data?.error?.details ?? [];
  const sentence = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  return Object.fromEntries(details.map((d) => [d.field, sentence(d.message)]));
}
