import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface PaymentAttributes {
  id: number;
  groupId: number;
  payerId: number; // User who makes the payment
  receiverId: number; // User who receives the payment
  amount: number;
  description?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentInput extends Optional<PaymentAttributes, 'id' | 'description' | 'createdAt' | 'updatedAt'> {}
export interface PaymentOutput extends Required<PaymentAttributes> {}

class Payment extends Model<PaymentAttributes, PaymentInput> implements PaymentAttributes {
  public id!: number;
  public groupId!: number;
  public payerId!: number;
  public receiverId!: number;
  public amount!: number;
  public description!: string | undefined;
  public date!: Date;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Payment.init(
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
    payerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    receiverId: {
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
      allowNull: true,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
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
    tableName: 'payments',
    modelName: 'Payment',
  }
);

export default Payment;
