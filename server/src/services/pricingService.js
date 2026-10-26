import { fn, col } from 'sequelize';
import { PriceHistory, Stock, sequelize } from '../models/index.js';
import env from '../config/env.js';
import { getMarketStatus } from './marketService.js';
import { nextPriceState } from './priceDrift.js';
import { marketClock } from '../utils/marketTime.js';

// Latest Price_History timestamp per stock. A stock whose last point falls on an earlier market
// date hasn't traded yet today, so this tick opens its session. Deriving it from the data (not
// in-memory state) means a server restart mid-day keeps the day's opening price and high/low.
async function lastRecordedByStock(transaction) {
  const rows = await PriceHistory.findAll({
    attributes: ['stockId', [fn('MAX', col('recorded_at')), 'lastRecordedAt']],
    group: ['stockId'],
    raw: true,
    transaction,
  });
  return new Map(rows.map((r) => [r.stockId, new Date(r.lastRecordedAt)]));
}

// Ticks closer together than this are treated as duplicates of the same scheduled slot, e.g. two
// server processes against one database. Well under any sensible PRICE_TICK_CRON interval.
const MIN_TICK_GAP_MS = 2000;

// Runs one generator tick. Returns what happened so the job can log it and tests can assert on it.
export async function runPriceTick({ now = new Date(), maxDriftPct = env.priceMaxDriftPct, random = Math.random } = {}) {
  const status = await getMarketStatus(now);
  if (!status.isOpen) return { ran: false, reason: status.reason, updated: 0 };

  const today = marketClock(now).date;

  const updated = await sequelize.transaction(async (transaction) => {
    // Locked so a trade executing during the tick fills at either the old or new price, never a mix.
    // The lock also serializes concurrent ticks, which makes the duplicate check below race-free.
    const stocks = await Stock.findAll({ order: [['stockId', 'ASC']], lock: transaction.LOCK.UPDATE, transaction });
    const lastRecorded = await lastRecordedByStock(transaction);

    const latest = Math.max(0, ...[...lastRecorded.values()].map((d) => d.getTime()));
    if (now.getTime() - latest < MIN_TICK_GAP_MS) return null;

    const history = [];
    for (const stock of stocks) {
      const last = lastRecorded.get(stock.stockId);
      const isNewSession = !last || marketClock(last).date !== today;
      const next = nextPriceState(stock, { isNewSession, maxDriftPct, random });
      await stock.update(next, { transaction });
      history.push({ stockId: stock.stockId, price: next.currentPrice, recordedAt: now });
    }
    await PriceHistory.bulkCreate(history, { transaction });
    return stocks.length;
  });

  if (updated === null) return { ran: false, reason: 'a tick was already recorded for this slot', updated: 0 };
  return { ran: true, reason: null, updated };
}
