'use strict';

const { buildDemoData } = require('./lib/demoData.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { stocks } = buildDemoData();
    const now = new Date();
    await queryInterface.bulkInsert(
      'Stocks',
      stocks.map((s) => ({
        ticker: s.ticker,
        company_name: s.companyName,
        total_volume: s.totalVolume,
        current_price: s.currentPrice,
        opening_price: s.openingPrice,
        daily_high: s.dailyHigh,
        daily_low: s.dailyLow,
        created_at: now,
        updated_at: now,
      })),
    );
  },

  async down(queryInterface) {
    const { stocks } = buildDemoData();
    await queryInterface.bulkDelete('Stocks', { ticker: stocks.map((s) => s.ticker) });
  },
};
