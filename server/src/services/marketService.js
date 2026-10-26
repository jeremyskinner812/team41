import { Op } from 'sequelize';
import { MarketSchedule, sequelize } from '../models/index.js';
import env from '../config/env.js';
import { badRequest, conflict } from '../utils/errors.js';
import { addDays, marketClock, marketTimeToUtc, normalizeTime, weekdayOf } from '../utils/marketTime.js';

// Market_Schedule stores one row per calendar date. The admin's weekday + holiday settings are
// applied by regenerating the rows from today through this many days ahead.
export const SCHEDULE_HORIZON_DAYS = 365;
export const WEEKDAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DEFAULT_HOURS = { openingTime: '09:30:00', closingTime: '16:00:00' };

function formatClock(time) {
  return time.slice(0, 5);
}

function sessionBounds(row) {
  return {
    opensAt: marketTimeToUtc(row.tradingDate, row.openingTime).toISOString(),
    closesAt: marketTimeToUtc(row.tradingDate, row.closingTime).toISOString(),
  };
}

async function findNextSession(date, time) {
  const row = await MarketSchedule.findOne({
    where: {
      isOpen: true,
      [Op.or]: [
        { tradingDate: { [Op.gt]: date } },
        { tradingDate: date, openingTime: { [Op.gt]: time } },
      ],
    },
    order: [['tradingDate', 'ASC']],
  });
  return row ? sessionBounds(row) : { opensAt: null, closesAt: null };
}

function closedReason(today, time) {
  if (!today) return 'No market schedule is configured for today';
  if (today.holidayName) return `Closed for ${today.holidayName}`;
  if (!today.isOpen) return 'Today is not a trading day';
  if (time < today.openingTime) return `Market opens at ${formatClock(today.openingTime)} CT`;
  return `Market closed at ${formatClock(today.closingTime)} CT`;
}

export async function getMarketStatus(now = new Date()) {
  const { date, time } = marketClock(now);
  const today = await MarketSchedule.findOne({ where: { tradingDate: date } });

  if (today?.isOpen && time >= today.openingTime && time < today.closingTime) {
    return { isOpen: true, ...sessionBounds(today), reason: null, timezone: env.marketTimezone };
  }

  return {
    isOpen: false,
    ...(await findNextSession(date, time)),
    reason: closedReason(today, time),
    timezone: env.marketTimezone,
  };
}

export async function isMarketOpen(now = new Date()) {
  return (await getMarketStatus(now)).isOpen;
}

export async function assertMarketOpen(now = new Date()) {
  const status = await getMarketStatus(now);
  if (!status.isOpen) throw conflict('MARKET_CLOSED', `The market is closed: ${status.reason}`);
}

// Hours currently in force: today's row if there is one, otherwise the next scheduled day.
async function currentHours(today, transaction) {
  const row = await MarketSchedule.findOne({
    where: { tradingDate: { [Op.gte]: today } },
    order: [['tradingDate', 'ASC']],
    transaction,
  });
  return row ? { openingTime: row.openingTime, closingTime: row.closingTime } : DEFAULT_HOURS;
}

export async function getMarketSettings(now = new Date()) {
  const { date: today } = marketClock(now);
  const rows = await MarketSchedule.findAll({
    where: { tradingDate: { [Op.gte]: today } },
    order: [['tradingDate', 'ASC']],
  });
  const hours = rows[0] ?? DEFAULT_HOURS;

  // A weekday counts as a trading day if any non-holiday occurrence of it is open.
  const openWeekdays = new Set(rows.filter((r) => r.isOpen).map((r) => weekdayOf(r.tradingDate)));
  return {
    openingTime: formatClock(hours.openingTime),
    closingTime: formatClock(hours.closingTime),
    tradingDays: WEEKDAY_CODES.filter((_, index) => openWeekdays.has(index)),
    holidays: rows.filter((r) => r.holidayName).map((r) => ({ date: r.tradingDate, name: r.holidayName })),
    timezone: env.marketTimezone,
    scheduledThrough: rows.at(-1)?.tradingDate ?? null,
  };
}

export async function updateMarketHours({ openingTime, closingTime }, now = new Date()) {
  const opening = normalizeTime(openingTime);
  const closing = normalizeTime(closingTime);
  if (opening >= closing) throw badRequest('INVALID_HOURS', 'Opening time must be earlier than closing time');

  const { date: today } = marketClock(now);
  // Past dates keep the hours they actually traded under.
  await MarketSchedule.update(
    { openingTime: opening, closingTime: closing },
    { where: { tradingDate: { [Op.gte]: today } } },
  );
  return getMarketSettings(now);
}

export async function updateMarketSchedule({ tradingDays, holidays }, now = new Date()) {
  const { date: today } = marketClock(now);
  const openWeekdays = new Set(tradingDays.map((code) => WEEKDAY_CODES.indexOf(code)));

  const holidayNames = new Map();
  for (const { date, name } of holidays) {
    if (date < today) throw badRequest('INVALID_HOLIDAY', `Holiday ${date} is in the past`);
    if (holidayNames.has(date)) throw badRequest('INVALID_HOLIDAY', `Holiday ${date} is listed twice`);
    holidayNames.set(date, name);
  }

  const lastHoliday = [...holidayNames.keys()].sort().at(-1);
  const horizonEnd = addDays(today, SCHEDULE_HORIZON_DAYS);
  const endDate = lastHoliday && lastHoliday > horizonEnd ? lastHoliday : horizonEnd;

  await sequelize.transaction(async (transaction) => {
    const { openingTime, closingTime } = await currentHours(today, transaction);
    const rows = [];
    for (let date = today; date <= endDate; date = addDays(date, 1)) {
      const holidayName = holidayNames.get(date) ?? null;
      rows.push({
        tradingDate: date,
        openingTime,
        closingTime,
        isOpen: openWeekdays.has(weekdayOf(date)) && !holidayName,
        holidayName,
      });
    }
    await MarketSchedule.bulkCreate(rows, {
      updateOnDuplicate: ['openingTime', 'closingTime', 'isOpen', 'holidayName'],
      transaction,
    });
  });

  return getMarketSettings(now);
}
