import { DataTypes, Model } from 'sequelize';

export const TRANSACTION_TYPES = ['BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL'];

export default function defineTransaction(sequelize) {
  class Transaction extends Model {}

  Transaction.init(
    {
      transactionId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      orderId: { type: DataTypes.INTEGER, allowNull: true },
      transactionType: { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [TRANSACTION_TYPES] } },
      amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      transactionTime: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'Transaction',
      tableName: 'Transactions',
      underscored: true,
      timestamps: false,
    },
  );

  return Transaction;
}
