'use strict';

const bcrypt = require('bcrypt');
const { buildDemoData } = require('./lib/demoData.cjs');

const BCRYPT_ROUNDS = 10;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { admin, customers } = buildDemoData();
    const people = [admin, ...customers];

    await queryInterface.sequelize.transaction(async (transaction) => {
      const rows = await Promise.all(
        people.map(async (p) => ({
          first_name: p.firstName,
          last_name: p.lastName,
          username: p.username,
          email: p.email,
          password_hash: await bcrypt.hash(p.password, BCRYPT_ROUNDS),
          role: p.role,
          created_at: new Date(),
        })),
      );
      await queryInterface.bulkInsert('Users', rows, { transaction });

      const [users] = await queryInterface.sequelize.query(
        'SELECT user_id, username FROM Users WHERE username IN (:usernames)',
        { replacements: { usernames: customers.map((c) => c.username) }, transaction },
      );
      const idByUsername = new Map(users.map((u) => [u.username, u.user_id]));

      // Admins do not trade, so only customers get a cash account.
      await queryInterface.bulkInsert(
        'Cash_Accounts',
        customers.map((c) => ({
          user_id: idByUsername.get(c.username),
          balance: c.activity.balance,
          created_at: new Date(),
          updated_at: new Date(),
        })),
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const { admin, customers } = buildDemoData();
    const usernames = [admin.username, ...customers.map((c) => c.username)];
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'DELETE ca FROM Cash_Accounts ca JOIN Users u ON u.user_id = ca.user_id WHERE u.username IN (:usernames)',
        { replacements: { usernames }, transaction },
      );
      await queryInterface.bulkDelete('Users', { username: usernames }, { transaction });
    });
  },
};
