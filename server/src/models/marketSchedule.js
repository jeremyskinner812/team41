import { DataTypes, Model } from 'sequelize';

export default function defineMarketSchedule(sequelize) {
  class MarketSchedule extends Model {}

  MarketSchedule.init(
    {
      scheduleId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      // Wall-clock times in the market timezone (America/Chicago), not UTC.
      openingTime: { type: DataTypes.TIME, allowNull: false },
      closingTime: { type: DataTypes.TIME, allowNull: false },
      tradingDate: { type: DataTypes.DATEONLY, allowNull: false, unique: 'market_schedule_trading_date_unique' },
      isOpen: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      holidayName: { type: DataTypes.STRING(100), allowNull: true },
    },
    {
      sequelize,
      modelName: 'MarketSchedule',
      tableName: 'Market_Schedule',
      underscored: true,
      timestamps: false,
    },
  );

  return MarketSchedule;
}
