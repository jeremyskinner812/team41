import { DataTypes, Model } from 'sequelize';

export default function defineStock(sequelize) {
  // market_cap is derived (total_volume × current_price) in the stock service, never stored.
  class Stock extends Model {}

  Stock.init(
    {
      stockId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      ticker: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: 'stocks_ticker_unique',
        validate: { is: /^[A-Z.]{1,10}$/ },
      },
      companyName: { type: DataTypes.STRING(100), allowNull: false },
      totalVolume: { type: DataTypes.BIGINT, allowNull: false, validate: { min: 1 } },
      currentPrice: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      openingPrice: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      dailyHigh: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      dailyLow: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    },
    {
      sequelize,
      modelName: 'Stock',
      tableName: 'Stocks',
      underscored: true,
      timestamps: true,
    },
  );

  return Stock;
}
