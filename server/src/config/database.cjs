// Shared by sequelize-cli (which requires CommonJS) and the ESM app via createRequire.
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  // Store and read DATETIMEs as UTC; market hours are converted to America/Chicago in services.
  timezone: '+00:00',
  dialectOptions: {
    // Return DECIMAL as strings so money never passes through a float.
    decimalNumbers: false,
  },
  define: {
    underscored: true,
  },
  migrationStorageTableName: 'SequelizeMeta',
  seederStorage: 'sequelize',
  seederStorageTableName: 'SequelizeData',
  logging: false,
};

module.exports = {
  development: base,
  test: { ...base, database: process.env.DB_TEST_NAME || `${process.env.DB_NAME}_test` },
  production: base,
};
