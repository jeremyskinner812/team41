import * as tradingService from '../services/tradingService.js';
import { validated } from '../middleware/validate.js';

export async function place(req, res) {
  res.status(201).json(await tradingService.placeOrder(req.user.userId, validated(req)));
}

export async function list(req, res) {
  res.json({ orders: await tradingService.listOrders(req.user.userId, validated(req)) });
}

export async function cancel(req, res) {
  res.json({ order: await tradingService.cancelOrder(req.user.userId, validated(req).id) });
}
