import { CashAccount, Holding, Order, Stock, Transaction, sequelize } from '../models/index.js';
import { assertMarketOpen } from './marketService.js';
import { findStockByTicker } from './stockService.js';
import { conflict, notFound, unprocessable } from '../utils/errors.js';
import { formatMoney, formatUsd, fromCents, MAX_MONEY_CENTS, multiplyToMoney, toCents } from '../utils/money.js';

export function serializeOrder(order) {
  return {
    orderId: order.orderId,
    ticker: order.stock?.ticker,
    companyName: order.stock?.companyName,
    orderType: order.orderType,
    quantity: order.quantity,
    price: formatMoney(order.price),
    total: fromCents(order.quantity * toCents(order.price)),
    status: order.status,
    orderTime: order.orderTime,
    filledTime: order.filledTime,
  };
}

function serializeHolding(holding, stock) {
  if (!holding) return { ticker: stock.ticker, quantity: 0, averageCost: null };
  return { ticker: stock.ticker, quantity: holding.quantity, averageCost: formatMoney(holding.averageCost) };
}

// Row locks (SELECT … FOR UPDATE), always taken in the order cash account → stock → holding, so
// two orders from the same customer queue up instead of both spending the same balance.
async function lockTradeRows(userId, ticker, transaction) {
  const account = await CashAccount.findOne({ where: { userId }, lock: transaction.LOCK.UPDATE, transaction });
  if (!account) throw notFound('Cash account not found');
  const stock = await findStockByTicker(ticker, { lock: transaction.LOCK.UPDATE, transaction });
  const holding = await Holding.findOne({
    where: { userId, stockId: stock.stockId },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  return { account, stock, holding };
}

async function fillOrder(order, transaction) {
  await order.update({ status: 'FILLED', filledTime: new Date() }, { transaction });
}

async function executeBuyOrder({ userId, quantity, account, stock, holding }, transaction) {
  const priceCents = toCents(stock.currentPrice);
  const costCents = priceCents * quantity;
  const balanceCents = toCents(account.balance);
  if (costCents > balanceCents) {
    throw unprocessable(
      'INSUFFICIENT_FUNDS',
      `Buying ${quantity} ${stock.ticker} at ${formatUsd(fromCents(priceCents))} costs ` +
        `${formatUsd(multiplyToMoney(quantity, stock.currentPrice))}, but your cash balance is ${formatUsd(fromCents(balanceCents))}`,
    );
  }

  const order = await Order.create(
    { userId, stockId: stock.stockId, orderType: 'BUY', quantity, price: fromCents(priceCents), status: 'PENDING' },
    { transaction },
  );
  await account.update({ balance: fromCents(balanceCents - costCents) }, { transaction });

  let updatedHolding;
  if (holding) {
    // Weighted average cost across the old and new shares, rounded to the cent.
    const newQuantity = holding.quantity + quantity;
    const totalCostCents = toCents(holding.averageCost) * holding.quantity + costCents;
    updatedHolding = await holding.update(
      { quantity: newQuantity, averageCost: fromCents(Math.round(totalCostCents / newQuantity)) },
      { transaction },
    );
  } else {
    updatedHolding = await Holding.create(
      { userId, stockId: stock.stockId, quantity, averageCost: fromCents(priceCents) },
      { transaction },
    );
  }

  await Transaction.create(
    { userId, orderId: order.orderId, transactionType: 'BUY', amount: fromCents(costCents) },
    { transaction },
  );
  await fillOrder(order, transaction);
  return { order, holding: updatedHolding };
}

async function executeSellOrder({ userId, quantity, account, stock, holding }, transaction) {
  const owned = holding?.quantity ?? 0;
  if (quantity > owned) {
    throw unprocessable(
      'INSUFFICIENT_SHARES',
      `You tried to sell ${quantity} ${stock.ticker} shares but own ${owned}`,
    );
  }

  const priceCents = toCents(stock.currentPrice);
  const proceedsCents = priceCents * quantity;
  const newBalanceCents = toCents(account.balance) + proceedsCents;
  if (newBalanceCents > MAX_MONEY_CENTS) throw unprocessable('BALANCE_LIMIT', 'Cash balance would exceed the maximum');

  const order = await Order.create(
    { userId, stockId: stock.stockId, orderType: 'SELL', quantity, price: fromCents(priceCents), status: 'PENDING' },
    { transaction },
  );
  await account.update({ balance: fromCents(newBalanceCents) }, { transaction });

  // Selling leaves the average cost of the remaining shares unchanged.
  let updatedHolding = null;
  if (quantity === owned) {
    await holding.destroy({ transaction });
  } else {
    updatedHolding = await holding.update({ quantity: owned - quantity }, { transaction });
  }

  await Transaction.create(
    { userId, orderId: order.orderId, transactionType: 'SELL', amount: fromCents(proceedsCents) },
    { transaction },
  );
  await fillOrder(order, transaction);
  return { order, holding: updatedHolding };
}

// Market order: executes immediately at the stock's current price. Cash, holding, order and
// transaction rows are written in one database transaction, so a failure anywhere writes nothing.
export async function placeOrder(userId, { ticker, orderType, quantity }) {
  await assertMarketOpen();

  const result = await sequelize.transaction(async (transaction) => {
    const { account, stock, holding } = await lockTradeRows(userId, ticker, transaction);
    const args = { userId, quantity, account, stock, holding };
    const executed = orderType === 'BUY'
      ? await executeBuyOrder(args, transaction)
      : await executeSellOrder(args, transaction);
    return { ...executed, account, stock };
  });

  const order = await Order.findByPk(result.order.orderId, { include: [{ model: Stock, as: 'stock' }] });
  return {
    order: serializeOrder(order),
    balance: formatMoney(result.account.balance),
    holding: serializeHolding(result.holding, result.stock),
  };
}

export async function listOrders(userId, { status } = {}) {
  const orders = await Order.findAll({
    where: { userId, ...(status ? { status } : {}) },
    include: [{ model: Stock, as: 'stock' }],
    order: [['orderTime', 'DESC'], ['orderId', 'DESC']],
  });
  return orders.map(serializeOrder);
}

export async function cancelOrder(userId, orderId) {
  await assertMarketOpen();

  return sequelize.transaction(async (transaction) => {
    // Scoped by user_id: another customer's order id reads as "not found", not "forbidden".
    const order = await Order.findOne({
      where: { orderId, userId },
      include: [{ model: Stock, as: 'stock' }],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (!order) throw notFound(`Order ${orderId} not found`);
    if (order.status !== 'PENDING') {
      throw conflict('ORDER_NOT_CANCELLABLE', `Order ${orderId} is ${order.status} and can no longer be cancelled`);
    }
    await order.update({ status: 'CANCELLED' }, { transaction });
    return serializeOrder(order);
  });
}
