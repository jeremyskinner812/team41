import { DataTypes, Model } from 'sequelize';

export default function defineCashAccount(sequelize) {
  class CashAccount extends Model {}

  CashAccount.init(
    {
      accountId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER, allowNull: false, unique: 'cash_accounts_user_id_unique' },
      balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: '0.00' },
    },
    {
      sequelize,
      modelName: 'CashAccount',
      tableName: 'Cash_Accounts',
      underscored: true,
      timestamps: true,
    },
  );

  return CashAccount;
}
