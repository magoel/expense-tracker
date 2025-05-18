import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ExpenseAttributes {
  id: number;
  groupId: number;
  paidById: number; // User who paid for the expense
  amount: number;
  description: string;
  date: Date;
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseInput extends Optional<ExpenseAttributes, 'id' | 'receiptUrl' | 'createdAt' | 'updatedAt'> {}
export interface ExpenseOutput extends Required<ExpenseAttributes> {}

class Expense extends Model<ExpenseAttributes, ExpenseInput> implements ExpenseAttributes {
  public id!: number;
  public groupId!: number;
  public paidById!: number;
  public amount!: number;
  public description!: string;
  public date!: Date;
  public receiptUrl!: string | undefined;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Expense.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'groups',
        key: 'id',
      },
    },
    paidById: {
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
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    receiptUrl: {
      type: DataTypes.STRING,
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
    tableName: 'expenses',
    modelName: 'Expense',
  }
);

export default Expense;
