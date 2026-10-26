// Integer-cent helpers for the few places the UI shows an estimate before the server responds.
// The server always prices the real order; these are display-only.

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

export function isMoneyInput(value) {
  return MONEY_PATTERN.test(String(value).trim());
}

function toCents(value) {
  const [whole, fraction = ''] = String(value).split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
}

export function estimateTotal(quantity, price) {
  if (!Number.isInteger(quantity) || quantity <= 0 || !price) return null;
  const cents = BigInt(quantity) * toCents(price);
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}
