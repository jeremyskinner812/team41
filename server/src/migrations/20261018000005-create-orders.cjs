'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Orders', {
      order_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      // RESTRICT: orders are part of the financial record and must not disappear with a user or stock.
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      stock_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Stocks', key: 'stock_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      order_type: { type: Sequelize.STRING(10), allowNull: false },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      price: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'PENDING' },
      order_time: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      filled_time: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('Orders', ['user_id', 'status'], { name: 'orders_user_id_status' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Orders');
  },
};
