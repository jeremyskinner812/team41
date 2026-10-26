import env from '../config/env.js';

// Market hours are wall-clock times in one timezone (America/Chicago). Everything else is UTC.

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: env.marketTimezone,
  hourCycle: 'h23',
  weekday: 'short',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function zonedParts(instant) {
  return Object.fromEntries(partsFormatter.formatToParts(instant).map((p) => [p.type, p.value]));
}

// { date: 'YYYY-MM-DD', time: 'HH:MM:SS', weekday: 0-6 } for an instant, in the market timezone.
export function marketClock(instant = new Date()) {
  const p = zonedParts(instant);
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}:${p.second}`,
    weekday: WEEKDAY_INDEX[p.weekday],
  };
}

// Converts a market-timezone wall-clock date + time into the UTC instant, honouring DST.
export function marketTimeToUtc(date, time) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm, ss = 0] = time.split(':').map(Number);
  const wallClockAsUtc = Date.UTC(y, m - 1, d, hh, mm, ss);
  const offsetAt = (instant) => {
    const p = zonedParts(new Date(instant));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - instant;
  };
  // Second pass corrects the offset when the first guess lands on the other side of a DST change.
  let utc = wallClockAsUtc - offsetAt(wallClockAsUtc);
  utc = wallClockAsUtc - offsetAt(utc);
  return new Date(utc);
}

// Date-only helpers on 'YYYY-MM-DD' strings, computed in UTC so DST never shifts the day.
export function addDays(date, days) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function weekdayOf(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// 'HH:MM' or 'HH:MM:SS' -> 'HH:MM:SS', so TIME values compare correctly as strings.
export function normalizeTime(time) {
  const [hh, mm, ss = '00'] = String(time).split(':');
  return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
