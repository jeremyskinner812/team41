import * as cashService from '../services/cashService.js';
import { validated } from '../middleware/validate.js';

export async function balance(req, res) {
  res.json(await cashService.getBalance(req.user.userId));
}

export async function deposit(req, res) {
  res.status(201).json(await cashService.deposit(req.user.userId, validated(req).amount));
}

export async function withdraw(req, res) {
  res.status(201).json(await cashService.withdraw(req.user.userId, validated(req).amount));
}
