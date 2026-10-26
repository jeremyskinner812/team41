import * as portfolioService from '../services/portfolioService.js';
import { validated } from '../middleware/validate.js';

export async function portfolio(req, res) {
  res.json(await portfolioService.getPortfolio(req.user.userId));
}

export async function transactions(req, res) {
  res.json({ transactions: await portfolioService.listTransactions(req.user.userId, validated(req)) });
}
