'use strict';

const { buildDemoData } = require('./lib/demoData.cjs');

async function stockIdsByTicker(queryInterface, tickers, transaction) {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT stock_id, ticker FROM Stocks WHERE ticker IN (:tickers)',
    { replacements: { tickers }, transaction },
  );
  return new Map(rows.map((r) => [r.ticker, r.stock_id]));
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { stocks } = buildDemoData();
    await queryInterface.sequelize.transaction(async (transaction) => {
      const ids = await stockIdsByTicker(queryInterface, stocks.map((s) => s.ticker), transaction);
      const rows = stocks.flatMap((s) =>
        s.history.map((h) => ({ stock_id: ids.get(s.ticker), price: h.price, recorded_at: h.recordedAt })),
      );
      await queryInterface.bulkInsert('Price_History', rows, { transaction });
    });
  },

  async down(queryInterface) {
    const { stocks } = buildDemoData();
    const ids = await stockIdsByTicker(queryInterface, stocks.map((s) => s.ticker));
    if (ids.size > 0) await queryInterface.bulkDelete('Price_History', { stock_id: [...ids.values()] });
  },
};
