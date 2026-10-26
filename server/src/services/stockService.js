import { Op } from 'sequelize';
import { PriceHistory, Stock, sequelize } from '../models/index.js';
import { conflict, notFound } from '../utils/errors.js';
import { formatMoney, multiplyToMoney } from '../utils/money.js';

export function serializeStock(stock) {
  return {
    stockId: stock.stockId,
    ticker: stock.ticker,
    companyName: stock.companyName,
    totalVolume: Number(stock.totalVolume),
    currentPrice: formatMoney(stock.currentPrice),
    openingPrice: formatMoney(stock.openingPrice),
    dailyHigh: formatMoney(stock.dailyHigh),
    dailyLow: formatMoney(stock.dailyLow),
    // Derived on every read so it always tracks the latest price.
    marketCap: multiplyToMoney(stock.totalVolume, stock.currentPrice),
    createdAt: stock.createdAt,
    updatedAt: stock.updatedAt,
  };
}

export async function listStocks() {
  const stocks = await Stock.findAll({ order: [['ticker', 'ASC']] });
  return stocks.map(serializeStock);
}

export async function findStockByTicker(ticker, options = {}) {
  const stock = await Stock.findOne({ where: { ticker: ticker.toUpperCase() }, ...options });
  if (!stock) throw notFound(`No stock with ticker ${ticker.toUpperCase()}`);
  return stock;
}

export async function getStock(ticker) {
  return serializeStock(await findStockByTicker(ticker));
}

export async function getPriceHistory(ticker, { from, to, limit = 500 } = {}) {
  const stock = await findStockByTicker(ticker);
  const recordedAt = {};
  if (from) recordedAt[Op.gte] = from;
  if (to) recordedAt[Op.lte] = to;

  // Take the most recent `limit` points, then return them oldest-first for charting.
  const rows = await PriceHistory.findAll({
    where: { stockId: stock.stockId, ...(from || to ? { recordedAt } : {}) },
    order: [['recordedAt', 'DESC']],
    limit,
  });
  return {
    ticker: stock.ticker,
    points: rows.reverse().map((r) => ({ price: formatMoney(r.price), recordedAt: r.recordedAt })),
  };
}

export async function createStock({ ticker, companyName, totalVolume, initialPrice }) {
  const normalizedTicker = ticker.toUpperCase();
  if (await Stock.findOne({ where: { ticker: normalizedTicker }, attributes: ['stockId'] })) {
    throw conflict('DUPLICATE_TICKER', `A stock with ticker ${normalizedTicker} already exists`);
  }

  const price = formatMoney(initialPrice);
  const stock = await sequelize.transaction(async (transaction) => {
    const created = await Stock.create(
      {
        ticker: normalizedTicker,
        companyName,
        totalVolume,
        currentPrice: price,
        openingPrice: price,
        dailyHigh: price,
        dailyLow: price,
      },
      { transaction },
    );
    // Seed the chart with the listing price so a new stock never has an empty history.
    await PriceHistory.create({ stockId: created.stockId, price }, { transaction });
    return created.reload({ transaction });
  });
  return serializeStock(stock);
}
