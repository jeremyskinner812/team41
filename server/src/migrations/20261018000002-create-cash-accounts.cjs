'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Cash_Accounts', {
      account_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      balance: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: '0.00' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
    // Unique user_id enforces the 1:1 User-to-Cash_Account relationship in the database itself.
    await queryInterface.addIndex('Cash_Accounts', ['user_id'], { unique: true, name: 'cash_accounts_user_id_unique' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Cash_Accounts');
  },
};
