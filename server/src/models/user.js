import { DataTypes, Model } from 'sequelize';

export const ROLES = ['customer', 'admin'];

export default function defineUser(sequelize) {
  class User extends Model {
    // Belt and braces: even if a query opts into the withPassword scope, the hash never serializes.
    toJSON() {
      const values = { ...this.get() };
      delete values.passwordHash;
      return values;
    }
  }

  User.init(
    {
      userId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      firstName: { type: DataTypes.STRING(50), allowNull: false },
      lastName: { type: DataTypes.STRING(50), allowNull: false },
      username: { type: DataTypes.STRING(50), allowNull: false, unique: 'users_username_unique' },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: 'users_email_unique',
        validate: { isEmail: true },
      },
      passwordHash: { type: DataTypes.STRING(255), allowNull: false },
      role: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'customer',
        validate: { isIn: [ROLES] },
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'Users',
      underscored: true,
      timestamps: true,
      updatedAt: false,
      defaultScope: { attributes: { exclude: ['passwordHash'] } },
      scopes: { withPassword: { attributes: { include: ['passwordHash'] } } },
    },
  );

  return User;
}
