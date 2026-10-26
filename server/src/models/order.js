import { DataTypes, Model } from 'sequelize';

export const ORDER_TYPES = ['BUY', 'SELL'];
export const ORDER_STATUSES = ['PENDING', 'FILLED', 'CANCELLED'];

export default function defineOrder(sequelize) {
  class Order extends Model {}

  Order.init(
    {
      orderId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      stockId: { type: DataTypes.INTEGER, allowNull: false },
      orderType: { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [ORDER_TYPES] } },
      quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
      price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'PENDING',
        validate: { isIn: [ORDER_STATUSES] },
      },
      orderTime: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      filledTime: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Order',
      tableName: 'Orders',
      underscored: true,
      timestamps: false,
    },
  );

  return Order;
}
