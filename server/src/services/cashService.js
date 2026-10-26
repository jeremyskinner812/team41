import { CashAccount, Transaction, sequelize } from '../models/index.js';
import { notFound, unprocessable } from '../utils/errors.js';
import { formatMoney, formatUsd, fromCents, MAX_MONEY_CENTS, toCents } from '../utils/money.js';

export const MAX_CASH_TRANSFER_CENTS = 100000000; // $1,000,000.00 per deposit or withdrawal.

function serializeCashTransaction(t) {
  return {
    transactionId: t.transactionId,
    transactionType: t.transactionType,
    amount: formatMoney(t.amount),
    transactionTime: t.transactionTime,
  };
}

async function lockAccount(userId, transaction) {
  const account = await CashAccount.findOne({ where: { userId }, lock: transaction.LOCK.UPDATE, transaction });
  if (!account) throw notFound('Cash account not found');
  return account;
}

export async function getBalance(userId) {
  const account = await CashAccount.findOne({ where: { userId } });
  if (!account) throw notFound('Cash account not found');
  return { balance: formatMoney(account.balance) };
}

export async function deposit(userId, amount) {
  const amountCents = toCents(amount);
  return sequelize.transaction(async (transaction) => {
    const account = await lockAccount(userId, transaction);
    const newBalanceCents = toCents(account.balance) + amountCents;
    if (newBalanceCents > MAX_MONEY_CENTS) throw unprocessable('BALANCE_LIMIT', 'Cash balance would exceed the maximum');

    await account.update({ balance: fromCents(newBalanceCents) }, { transaction });
    const record = await Transaction.create(
      { userId, orderId: null, transactionType: 'DEPOSIT', amount: fromCents(amountCents) },
      { transaction },
    );
    await record.reload({ transaction }); // DB-rounded timestamp, matching later reads
    return { balance: fromCents(newBalanceCents), transaction: serializeCashTransaction(record) };
  });
}

export async function withdraw(userId, amount) {
  const amountCents = toCents(amount);
  return sequelize.transaction(async (transaction) => {
    // Locked so two simultaneous withdrawals can't both pass the balance check.
    const account = await lockAccount(userId, transaction);
    const balanceCents = toCents(account.balance);
    if (amountCents > balanceCents) {
      throw unprocessable(
        'INSUFFICIENT_FUNDS',
        `Cannot withdraw ${formatUsd(fromCents(amountCents))}; your available balance is ${formatUsd(fromCents(balanceCents))}`,
      );
    }

    await account.update({ balance: fromCents(balanceCents - amountCents) }, { transaction });
    const record = await Transaction.create(
      { userId, orderId: null, transactionType: 'WITHDRAWAL', amount: fromCents(amountCents) },
      { transaction },
    );
    await record.reload({ transaction }); // DB-rounded timestamp, matching later reads
    return { balance: fromCents(balanceCents - amountCents), transaction: serializeCashTransaction(record) };
  });
}
