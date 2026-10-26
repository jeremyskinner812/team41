'use strict';

const { QueryTypes } = require('sequelize');
const { buildDemoData } = require('./lib/demoData.cjs');

// Orders, transactions and holdings that match the cash balances written by the users seeder.

// Raw-query replacements format a JS Date in server-local time, unlike bulkInsert, which honours
// the configured UTC timezone, so pass an explicit UTC DATETIME string instead.
function toUtcDatetime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function lookupIds(queryInterface, customers, stocks, transaction) {
  const [users] = await queryInterface.sequelize.query(
    'SELECT user_id, username FROM Users WHERE username IN (:usernames)',
    { replacements: { usernames: customers.map((c) => c.username) }, transaction },
  );
  const [stockRows] = await queryInterface.sequelize.query(
    'SELECT stock_id, ticker FROM Stocks WHERE ticker IN (:tickers)',
    { replacements: { tickers: stocks.map((s) => s.ticker) }, transaction },
  );
  return {
    userIds: new Map(users.map((u) => [u.username, u.user_id])),
    stockIds: new Map(stockRows.map((s) => [s.ticker, s.stock_id])),
  };
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { customers, stocks } = buildDemoData();

    await queryInterface.sequelize.transaction(async (transaction) => {
      const { userIds, stockIds } = await lookupIds(queryInterface, customers, stocks, transaction);

      for (const customer of customers) {
        const userId = userIds.get(customer.username);
        const { deposit, trades, holdings } = customer.activity;

        await queryInterface.bulkInsert(
          'Transactions',
          [{ user_id: userId, order_id: null, transaction_type: 'DEPOSIT', amount: deposit.amount, transaction_time: deposit.time }],
          { transaction },
        );

        for (const trade of trades) {
          // Raw INSERT so MySQL hands back the new order_id for the matching transaction row.
          const [orderId] = await queryInterface.sequelize.query(
            `INSERT INTO Orders (user_id, stock_id, order_type, quantity, price, status, order_time, filled_time)
             VALUES (:userId, :stockId, :orderType, :quantity, :price, 'FILLED', :time, :time)`,
            {
              replacements: {
                userId,
                stockId: stockIds.get(trade.ticker),
                orderType: trade.orderType,
                quantity: trade.quantity,
                price: trade.price,
                time: toUtcDatetime(trade.time),
              },
              type: QueryTypes.INSERT,
              transaction,
            },
          );
          await queryInterface.bulkInsert(
            'Transactions',
            [{ user_id: userId, order_id: orderId, transaction_type: trade.orderType, amount: trade.amount, transaction_time: trade.time }],
            { transaction },
          );
        }

        if (holdings.length > 0) {
          const now = new Date();
          await queryInterface.bulkInsert(
            'Holdings',
            holdings.map((h) => ({
              user_id: userId,
              stock_id: stockIds.get(h.ticker),
              quantity: h.quantity,
              average_cost: h.averageCost,
              created_at: now,
              updated_at: now,
            })),
            { transaction },
          );
        }
      }
    });
  },

  async down(queryInterface) {
    const { customers, stocks } = buildDemoData();
    await queryInterface.sequelize.transaction(async (transaction) => {
      const { userIds } = await lookupIds(queryInterface, customers, stocks, transaction);
      const ids = [...userIds.values()];
      if (ids.length === 0) return;
      // Transactions reference Orders, so they go first.
      await queryInterface.bulkDelete('Transactions', { user_id: ids }, { transaction });
      await queryInterface.bulkDelete('Orders', { user_id: ids }, { transaction });
      await queryInterface.bulkDelete('Holdings', { user_id: ids }, { transaction });
    });
  },
};
