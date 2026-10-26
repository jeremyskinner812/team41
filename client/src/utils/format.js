// Display formatting only. Money arrives from the API as "1234.50" strings and is formatted as
// text, never converted to a float, except for the abbreviated market-cap display.

const MARKET_TZ_FALLBACK = 'America/Chicago';

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—';
  const [rawWhole, fraction = '00'] = String(value).split('.');
  const negative = rawWhole.startsWith('-');
  const whole = negative ? rawWhole.slice(1) : rawWhole;
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}$${grouped}.${fraction.padEnd(2, '0').slice(0, 2)}`;
}

const compactMoney = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
});
export function formatCompactMoney(value) {
  return value === null || value === undefined ? '—' : compactMoney.format(Number(value));
}

const compactNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });
export function formatCompactNumber(value) {
  return value === null || value === undefined ? '—' : compactNumber.format(Number(value));
}

const fullNumber = new Intl.NumberFormat('en-US');
export function formatNumber(value) {
  return value === null || value === undefined ? '—' : fullNumber.format(Number(value));
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// Market times are shown in the market's own timezone, labelled CT.
export function formatMarketTime(iso, timeZone = MARKET_TZ_FALLBACK, { withDay = false } = {}) {
  if (!iso) return '—';
  const options = { timeZone, hour: 'numeric', minute: '2-digit' };
  if (withDay) Object.assign(options, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${new Date(iso).toLocaleString('en-US', options)} CT`;
}

// 'YYYY-MM-DD' -> 'Thu, Nov 26, 2026' without shifting the day through a timezone.
export function formatDateOnly(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function signClass(value, styles) {
  if (!value || /^-?0(\.0+)?$/.test(value)) return '';
  return String(value).startsWith('-') ? styles.negative : styles.positive;
}
