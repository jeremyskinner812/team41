'use strict';

const { buildDemoData } = require('./lib/demoData.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { schedule } = buildDemoData();
    await queryInterface.bulkInsert('Market_Schedule', schedule.rows);
  },

  async down(queryInterface) {
    // The schedule window is relative to the seed date, so clear every row rather than guessing dates.
    await queryInterface.bulkDelete('Market_Schedule', {});
  },
};
