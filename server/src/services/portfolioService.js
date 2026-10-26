import { CashAccount, Holding, Order, Stock, Transaction } from '../models/index.js';
import { notFound } from '../utils/errors.js';
import { formatMoney, fromCents, toCents } from '../utils/money.js';

function percentChange(gainCents, costCents) {
  if (costCents === 0) return '0.00';
  return ((gainCents / costCents) * 100).toFixed(2);
}

// Every query here is scoped to the caller's user_id.
export async function getPortfolio(userId) {
  const [account, holdings] = await Promise.all([
    CashAccount.findOne({ where: { userId } }),
    Holding.findAll({
      where: { userId },
      include: [{ model: Stock, as: 'stock' }],
      order: [[{ model: Stock, as: 'stock' }, 'ticker', 'ASC']],
    }),
  ]);
  if (!account) throw notFound('Cash account not found');

  let holdingsValueCents = 0;
  let costBasisCents = 0;
  const rows = holdings.map((h) => {
    const valueCents = h.quantity * toCents(h.stock.currentPrice);
    const costCents = h.quantity * toCents(h.averageCost);
    holdingsValueCents += valueCents;
    costBasisCents += costCents;
    return {
      ticker: h.stock.ticker,
      companyName: h.stock.companyName,
      quantity: h.quantity,
      averageCost: formatMoney(h.averageCost),
      currentPrice: formatMoney(h.stock.currentPrice),
      marketValue: fromCents(valueCents),
      costBasis: fromCents(costCents),
      gainLoss: fromCents(valueCents - costCents),
      gainLossPct: percentChange(valueCents - costCents, costCents),
    };
  });

  const cashCents = toCents(account.balance);
  return {
    cash: fromCents(cashCents),
    holdingsValue: fromCents(holdingsValueCents),
    costBasis: fromCents(costBasisCents),
    gainLoss: fromCents(holdingsValueCents - costBasisCents),
    totalValue: fromCents(cashCents + holdingsValueCents),
    holdings: rows,
  };
}

export async function listTransactions(userId, { type, limit = 100 } = {}) {
  const transactions = await Transaction.findAll({
    where: { userId, ...(type ? { transactionType: type } : {}) },
    include: [{ model: Order, as: 'order', include: [{ model: Stock, as: 'stock' }] }],
    order: [['transactionTime', 'DESC'], ['transactionId', 'DESC']],
    limit,
  });
  return transactions.map((t) => ({
    transactionId: t.transactionId,
    transactionType: t.transactionType,
    amount: formatMoney(t.amount),
    transactionTime: t.transactionTime,
    orderId: t.orderId,
    ticker: t.order?.stock?.ticker ?? null,
    quantity: t.order?.quantity ?? null,
    price: t.order ? formatMoney(t.order.price) : null,
  }));
}
