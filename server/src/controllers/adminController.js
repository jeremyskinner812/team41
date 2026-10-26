import * as marketService from '../services/marketService.js';
import * as stockService from '../services/stockService.js';
import { validated } from '../middleware/validate.js';

export async function createStock(req, res) {
  res.status(201).json({ stock: await stockService.createStock(validated(req)) });
}

export async function listStocks(req, res) {
  res.json({ stocks: await stockService.listStocks() });
}

export async function marketSettings(req, res) {
  res.json(await marketService.getMarketSettings());
}

export async function updateHours(req, res) {
  res.json(await marketService.updateMarketHours(validated(req)));
}

export async function updateSchedule(req, res) {
  res.json(await marketService.updateMarketSchedule(validated(req)));
}
