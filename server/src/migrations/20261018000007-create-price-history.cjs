'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Price_History', {
      history_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      stock_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Stocks', key: 'stock_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      price: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      recorded_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    // Charts read one stock's history in time order.
    await queryInterface.addIndex('Price_History', ['stock_id', 'recorded_at'], {
      name: 'price_history_stock_id_recorded_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Price_History');
  },
};
