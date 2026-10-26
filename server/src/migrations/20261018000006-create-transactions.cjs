'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Transactions', {
      transaction_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      // NULL for deposits and withdrawals.
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Orders', key: 'order_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      transaction_type: { type: Sequelize.STRING(20), allowNull: false },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      transaction_time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('Transactions', ['user_id', 'transaction_time'], {
      name: 'transactions_user_id_transaction_time',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Transactions');
  },
};
