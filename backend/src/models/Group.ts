import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { generateRandomBase36Code } from '../utils/codeGenerator';

interface GroupAttributes {
  id: number;
  name: string;
  description?: string;
  code: string; // unique base36 code of length 10
  currency: string; // single currency for the group
  creatorId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupInput extends Optional<GroupAttributes, 'id' | 'description' | 'createdAt' | 'updatedAt' | 'code'> {}
export interface GroupOutput extends Required<GroupAttributes> {}

class Group extends Model<GroupAttributes, GroupInput> implements GroupAttributes {
  public id!: number;
  public name!: string;
  public description!: string | undefined;
  public code!: string;
  public currency!: string;
  public creatorId!: number;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Group.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      defaultValue: () => generateRandomBase36Code(10),
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
    },
    creatorId: {
      type: DataTypes.INTEGER,
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
    tableName: 'groups',
    modelName: 'Group',
  }
);

export default Group;
