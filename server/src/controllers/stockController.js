import * as stockService from '../services/stockService.js';
import { validated } from '../middleware/validate.js';

export async function list(req, res) {
  res.json({ stocks: await stockService.listStocks() });
}

export async function detail(req, res) {
  res.json({ stock: await stockService.getStock(validated(req).ticker) });
}

export async function history(req, res) {
  const { ticker, from, to, limit } = validated(req);
  res.json(await stockService.getPriceHistory(ticker, { from, to, limit }));
}
