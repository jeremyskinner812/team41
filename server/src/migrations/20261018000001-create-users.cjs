'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      user_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      first_name: { type: Sequelize.STRING(50), allowNull: false },
      last_name: { type: Sequelize.STRING(50), allowNull: false },
      username: { type: Sequelize.STRING(50), allowNull: false },
      email: { type: Sequelize.STRING(100), allowNull: false },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      role: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'customer' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('Users', ['username'], { unique: true, name: 'users_username_unique' });
    await queryInterface.addIndex('Users', ['email'], { unique: true, name: 'users_email_unique' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Users');
  },
};
