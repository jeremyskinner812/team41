import { DataTypes, Model } from 'sequelize';

export default function definePriceHistory(sequelize) {
  class PriceHistory extends Model {}

  PriceHistory.init(
    {
      historyId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      stockId: { type: DataTypes.INTEGER, allowNull: false },
      price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      recordedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'PriceHistory',
      tableName: 'Price_History',
      underscored: true,
      timestamps: false,
    },
  );

  return PriceHistory;
}
