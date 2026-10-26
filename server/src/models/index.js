import { createRequire } from 'node:module';
import { Sequelize } from 'sequelize';
import env from '../config/env.js';
import defineUser from './user.js';
import defineCashAccount from './cashAccount.js';
import defineStock from './stock.js';
import defineHolding from './holding.js';
import defineOrder from './order.js';
import defineTransaction from './transaction.js';
import definePriceHistory from './priceHistory.js';
import defineMarketSchedule from './marketSchedule.js';

// Same config file sequelize-cli uses, so the app and migrations can never point at different DBs.
const require = createRequire(import.meta.url);
const dbConfig = require('../config/database.cjs')[env.nodeEnv];

export const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);

export const User = defineUser(sequelize);
export const CashAccount = defineCashAccount(sequelize);
export const Stock = defineStock(sequelize);
export const Holding = defineHolding(sequelize);
export const Order = defineOrder(sequelize);
export const Transaction = defineTransaction(sequelize);
export const PriceHistory = definePriceHistory(sequelize);
export const MarketSchedule = defineMarketSchedule(sequelize);

User.hasOne(CashAccount, { foreignKey: 'userId', as: 'cashAccount' });
CashAccount.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Holding, { foreignKey: 'userId', as: 'holdings' });
Holding.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Stock.hasMany(Holding, { foreignKey: 'stockId', as: 'holdings' });
Holding.belongsTo(Stock, { foreignKey: 'stockId', as: 'stock' });

Stock.hasMany(Order, { foreignKey: 'stockId', as: 'orders' });
Order.belongsTo(Stock, { foreignKey: 'stockId', as: 'stock' });

Stock.hasMany(PriceHistory, { foreignKey: 'stockId', as: 'priceHistory' });
PriceHistory.belongsTo(Stock, { foreignKey: 'stockId', as: 'stock' });

Order.hasMany(Transaction, { foreignKey: 'orderId', as: 'transactions' });
Transaction.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

export default {
  sequelize,
  User,
  CashAccount,
  Stock,
  Holding,
  Order,
  Transaction,
  PriceHistory,
  MarketSchedule,
};
