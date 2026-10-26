'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Stocks', {
      stock_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      ticker: { type: Sequelize.STRING(10), allowNull: false },
      company_name: { type: Sequelize.STRING(100), allowNull: false },
      total_volume: { type: Sequelize.BIGINT, allowNull: false },
      current_price: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      opening_price: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      daily_high: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      daily_low: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('Stocks', ['ticker'], { unique: true, name: 'stocks_ticker_unique' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Stocks');
  },
};
