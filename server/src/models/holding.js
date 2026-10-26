import { DataTypes, Model } from 'sequelize';

export default function defineHolding(sequelize) {
  class Holding extends Model {}

  Holding.init(
    {
      holdingId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      stockId: { type: DataTypes.INTEGER, allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
      averageCost: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    },
    {
      sequelize,
      modelName: 'Holding',
      tableName: 'Holdings',
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, name: 'holdings_user_id_stock_id_unique', fields: ['user_id', 'stock_id'] }],
    },
  );

  return Holding;
}
