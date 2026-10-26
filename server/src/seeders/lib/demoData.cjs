'use strict';

// Deterministic demo data shared by every seeder, so stock prices, price history, orders,
// holdings and cash balances all agree with each other. Lives in a subfolder so sequelize-cli
// (which only scans the top level of seeders/) never tries to run it as a seeder.
//
// All money is computed in integer cents and only formatted to "0.00" strings at the edge.

const MARKET_TZ = 'America/Chicago';
const OPENING_TIME = '09:30:00';
const CLOSING_TIME = '16:00:00';
const HISTORY_TRADING_DAYS = 10;
const HISTORY_INTERVAL_MINUTES = 30;
const MAX_STEP_DRIFT = 0.01; // ±1% per 30-minute step keeps the seeded chart gradual.
const MIN_PRICE_CENTS = 1;
const SCHEDULE_DAYS_BACK = 30;
const SCHEDULE_DAYS_AHEAD = 365;

const STOCKS = [
  { ticker: 'AAPL', companyName: 'Apple Inc.', totalVolume: 14900000000, priceCents: 23215 },
  { ticker: 'MSFT', companyName: 'Microsoft Corporation', totalVolume: 7430000000, priceCents: 42860 },
  { ticker: 'GOOGL', companyName: 'Alphabet Inc.', totalVolume: 12100000000, priceCents: 17640 },
  { ticker: 'AMZN', companyName: 'Amazon.com, Inc.', totalVolume: 10600000000, priceCents: 19825 },
  { ticker: 'NVDA', companyName: 'NVIDIA Corporation', totalVolume: 24400000000, priceCents: 18130 },
  { ticker: 'TSLA', companyName: 'Tesla, Inc.', totalVolume: 3220000000, priceCents: 25180 },
  { ticker: 'META', companyName: 'Meta Platforms, Inc.', totalVolume: 2520000000, priceCents: 61245 },
  { ticker: 'JPM', companyName: 'JPMorgan Chase & Co.', totalVolume: 2780000000, priceCents: 24110 },
  { ticker: 'KO', companyName: 'The Coca-Cola Company', totalVolume: 4310000000, priceCents: 6835 },
  { ticker: 'DIS', companyName: 'The Walt Disney Company', totalVolume: 1810000000, priceCents: 11270 },
];

// Dev-only demo credentials, documented in README.md.
const ADMIN = {
  firstName: 'Ada',
  lastName: 'Admin',
  username: 'admin',
  email: 'admin@eztrader.local',
  password: 'Admin123!',
  role: 'admin',
};

const CUSTOMER_PASSWORD = 'Password123!';

// `day` indexes into the seeded trading days (0 = oldest); `step` into that day's price points.
const CUSTOMERS = [
  {
    firstName: 'Jane',
    lastName: 'Doe',
    username: 'jdoe',
    email: 'jane.doe@example.com',
    depositCents: 2500000,
    trades: [
      { ticker: 'AAPL', orderType: 'BUY', quantity: 20, day: 1, step: 2 },
      { ticker: 'MSFT', orderType: 'BUY', quantity: 10, day: 3, step: 5 },
      { ticker: 'AAPL', orderType: 'SELL', quantity: 5, day: 7, step: 9 },
    ],
  },
  {
    firstName: 'Marcus',
    lastName: 'Smith',
    username: 'msmith',
    email: 'marcus.smith@example.com',
    depositCents: 1500000,
    trades: [
      { ticker: 'NVDA', orderType: 'BUY', quantity: 30, day: 4, step: 1 },
      { ticker: 'KO', orderType: 'BUY', quantity: 50, day: 6, step: 8 },
    ],
  },
  {
    firstName: 'Alex',
    lastName: 'Lee',
    username: 'alee',
    email: 'alex.lee@example.com',
    depositCents: 1000000,
    trades: [],
  },
];

const HOLIDAY_NAME = 'Thanksgiving Day';

function centsToDecimal(cents) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

// mulberry32: tiny seeded PRNG so every `db:seed` produces the same price paths.
function createRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Date-only arithmetic on 'YYYY-MM-DD' strings, done in UTC so DST never shifts the day.
function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const date = parseDate(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

function weekday(dateStr) {
  return parseDate(dateStr).getUTCDay();
}

function todayInMarketTz(now) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MARKET_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

// Converts a wall-clock time in America/Chicago to a UTC Date, respecting CST/CDT.
function marketTimeToUtc(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const wallClockAsUtc = Date.UTC(y, m - 1, d, hh, mm);
  const offsetAt = (instant) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: MARKET_TZ,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
        .formatToParts(new Date(instant))
        .map((p) => [p.type, p.value]),
    );
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    return asUtc - instant;
  };
  let utc = wallClockAsUtc - offsetAt(wallClockAsUtc);
  utc = wallClockAsUtc - offsetAt(utc);
  return new Date(utc);
}

// US Thanksgiving: fourth Thursday of November.
function thanksgiving(year) {
  const nov1 = new Date(Date.UTC(year, 10, 1));
  const firstThursday = 1 + ((4 - nov1.getUTCDay() + 7) % 7);
  return formatDate(new Date(Date.UTC(year, 10, firstThursday + 21)));
}

function nextHolidayDate(today) {
  const year = Number(today.slice(0, 4));
  const thisYear = thanksgiving(year);
  return thisYear >= today ? thisYear : thanksgiving(year + 1);
}

function buildMarketSchedule(today) {
  const holidayDate = nextHolidayDate(today);
  const rows = [];
  for (let offset = -SCHEDULE_DAYS_BACK; offset <= SCHEDULE_DAYS_AHEAD; offset += 1) {
    const date = addDays(today, offset);
    const day = weekday(date);
    const isWeekday = day >= 1 && day <= 5;
    const isHoliday = date === holidayDate;
    rows.push({
      opening_time: OPENING_TIME,
      closing_time: CLOSING_TIME,
      trading_date: date,
      is_open: isWeekday && !isHoliday,
      holiday_name: isHoliday ? HOLIDAY_NAME : null,
    });
  }
  return { rows, holidayDate };
}

// The most recent completed trading days before today, oldest first.
function pastTradingDays(today, schedule) {
  const openDates = new Set(schedule.rows.filter((r) => r.is_open).map((r) => r.trading_date));
  const days = [];
  let date = addDays(today, -1);
  while (days.length < HISTORY_TRADING_DAYS) {
    if (openDates.has(date)) days.unshift(date);
    date = addDays(date, -1);
  }
  return days;
}

function intradayTimes() {
  const times = [];
  const [openH, openM] = OPENING_TIME.split(':').map(Number);
  const [closeH, closeM] = CLOSING_TIME.split(':').map(Number);
  for (let mins = openH * 60 + openM; mins <= closeH * 60 + closeM; mins += HISTORY_INTERVAL_MINUTES) {
    times.push(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`);
  }
  return times;
}

// Walks backwards from the stock's current price so the last history point equals current_price.
function buildPricePath(stock, tradingDays, times) {
  const random = createRandom(hashString(stock.ticker));
  const total = tradingDays.length * times.length;
  const cents = new Array(total);
  cents[total - 1] = stock.priceCents;
  for (let i = total - 2; i >= 0; i -= 1) {
    const drift = (random() * 2 - 1) * MAX_STEP_DRIFT;
    cents[i] = Math.max(MIN_PRICE_CENTS, Math.round(cents[i + 1] / (1 + drift)));
  }

  const points = [];
  tradingDays.forEach((date, dayIndex) => {
    times.forEach((time, step) => {
      points.push({
        day: dayIndex,
        step,
        priceCents: cents[dayIndex * times.length + step],
        recordedAt: marketTimeToUtc(date, time),
      });
    });
  });
  return points;
}

function buildCustomerActivity(customer, pathsByTicker, firstTradingDay) {
  let balanceCents = customer.depositCents;
  const positions = new Map();
  const trades = customer.trades.map((trade) => {
    const point = pathsByTicker.get(trade.ticker).find((p) => p.day === trade.day && p.step === trade.step);
    const totalCents = point.priceCents * trade.quantity;
    const position = positions.get(trade.ticker) || { quantity: 0, costCents: 0 };

    if (trade.orderType === 'BUY') {
      if (totalCents > balanceCents) throw new Error(`Seed trade exceeds cash for ${customer.username}`);
      balanceCents -= totalCents;
      position.quantity += trade.quantity;
      position.costCents += totalCents;
    } else {
      if (trade.quantity > position.quantity) throw new Error(`Seed sell exceeds holding for ${customer.username}`);
      balanceCents += totalCents;
      // Selling keeps the average cost per share unchanged; remove that share of the cost basis.
      const avgCents = Math.round(position.costCents / position.quantity);
      position.quantity -= trade.quantity;
      position.costCents = position.quantity === 0 ? 0 : position.costCents - avgCents * trade.quantity;
    }
    positions.set(trade.ticker, position);

    return {
      ticker: trade.ticker,
      orderType: trade.orderType,
      quantity: trade.quantity,
      price: centsToDecimal(point.priceCents),
      amount: centsToDecimal(totalCents),
      time: point.recordedAt,
    };
  });

  const holdings = [...positions.entries()]
    .filter(([, p]) => p.quantity > 0)
    .map(([ticker, p]) => ({
      ticker,
      quantity: p.quantity,
      averageCost: centsToDecimal(Math.round(p.costCents / p.quantity)),
    }));

  return {
    deposit: {
      amount: centsToDecimal(customer.depositCents),
      // The opening deposit lands the evening before the first seeded trading day.
      time: marketTimeToUtc(addDays(firstTradingDay, -1), '18:00'),
    },
    trades,
    holdings,
    balance: centsToDecimal(balanceCents),
  };
}

function buildDemoData(now = new Date()) {
  const today = todayInMarketTz(now);
  const schedule = buildMarketSchedule(today);
  const tradingDays = pastTradingDays(today, schedule);
  const times = intradayTimes();

  const pathsByTicker = new Map();
  const stocks = STOCKS.map((stock) => {
    const path = buildPricePath(stock, tradingDays, times);
    pathsByTicker.set(stock.ticker, path);
    const lastDay = path.filter((p) => p.day === tradingDays.length - 1).map((p) => p.priceCents);
    return {
      ticker: stock.ticker,
      companyName: stock.companyName,
      totalVolume: stock.totalVolume,
      currentPrice: centsToDecimal(stock.priceCents),
      openingPrice: centsToDecimal(lastDay[0]),
      dailyHigh: centsToDecimal(Math.max(...lastDay)),
      dailyLow: centsToDecimal(Math.min(...lastDay)),
      history: path.map((p) => ({ price: centsToDecimal(p.priceCents), recordedAt: p.recordedAt })),
    };
  });

  const customers = CUSTOMERS.map((customer) => ({
    ...customer,
    password: CUSTOMER_PASSWORD,
    role: 'customer',
    activity: buildCustomerActivity(customer, pathsByTicker, tradingDays[0]),
  }));

  return { today, admin: ADMIN, customers, stocks, schedule };
}

module.exports = { buildDemoData };
