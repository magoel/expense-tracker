import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ExpenseShareAttributes {
  id: number;
  expenseId: number;
  userId: number;
  amount: number; // The share amount owed by this user for this expense
  isPaid: boolean; // To track if this share has been paid
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseShareInput extends Optional<ExpenseShareAttributes, 'id' | 'isPaid' | 'paidAt' | 'createdAt' | 'updatedAt'> {}
export interface ExpenseShareOutput extends Required<ExpenseShareAttributes> {}

class ExpenseShare extends Model<ExpenseShareAttributes, ExpenseShareInput> implements ExpenseShareAttributes {
  public id!: number;
  public expenseId!: number;
  public userId!: number;
  public amount!: number;
  public isPaid!: boolean;
  public paidAt!: Date | undefined;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ExpenseShare.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    expenseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'expenses',
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'expense_shares',
    modelName: 'ExpenseShare',
    indexes: [
      {
        unique: true,
        fields: ['expenseId', 'userId'],
      },
    ],
  }
);

export default ExpenseShare;
