import * as marketService from '../services/marketService.js';

export async function status(req, res) {
  res.json(await marketService.getMarketStatus());
}
