// All money math happens in integer cents; values cross the API and the database as "0.00" strings.
// DECIMAL(15,2) comes back from mysql2 as a string, so no amount ever passes through a float.

const MONEY_PATTERN = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

// DECIMAL(15,2) holds at most 13 integer digits.
export const MAX_MONEY_CENTS = 999999999999999;

export function isMoneyString(value) {
  return MONEY_PATTERN.test(String(value).trim());
}

export function toCents(value) {
  if (value === null || value === undefined) throw new TypeError('Money value is required');
  const match = MONEY_PATTERN.exec(String(value).trim());
  if (!match) throw new TypeError(`Invalid money value: ${value}`);
  const [, sign, whole, fraction = ''] = match;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return sign ? -cents : cents;
}

export function fromCents(cents) {
  if (!Number.isSafeInteger(cents)) throw new TypeError(`Cents must be a safe integer, got ${cents}`);
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

export function formatMoney(value) {
  return value === null || value === undefined ? null : fromCents(toCents(value));
}

// Integer-safe for values beyond 2^53 (market caps), returned as a "0.00" string.
export function multiplyToMoney(quantity, priceValue) {
  const cents = BigInt(quantity) * BigInt(toCents(priceValue));
  const sign = cents < 0n ? '-' : '';
  const abs = cents < 0n ? -cents : cents;
  return `${sign}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
}

// "$1,234.56" for human-readable error messages; API fields stay plain "1234.56" strings.
export function formatUsd(amount) {
  const [whole, fraction] = String(amount).replace('-', '').split('.');
  const sign = String(amount).startsWith('-') ? '-' : '';
  return `${sign}$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
}
