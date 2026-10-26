'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Market_Schedule', {
      schedule_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      opening_time: { type: Sequelize.TIME, allowNull: false },
      closing_time: { type: Sequelize.TIME, allowNull: false },
      trading_date: { type: Sequelize.DATEONLY, allowNull: false },
      is_open: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      holiday_name: { type: Sequelize.STRING(100), allowNull: true },
    });
    // One schedule row per calendar date, so "is today open?" is a single unambiguous lookup.
    await queryInterface.addIndex('Market_Schedule', ['trading_date'], {
      unique: true,
      name: 'market_schedule_trading_date_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Market_Schedule');
  },
};
