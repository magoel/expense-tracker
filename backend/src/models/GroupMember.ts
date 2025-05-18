import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface GroupMemberAttributes {
  id: number;
  userId: number;
  groupId: number;
  status: 'active' | 'pending' | 'rejected'; // For join request approval
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMemberInput extends Optional<GroupMemberAttributes, 'id' | 'createdAt' | 'updatedAt' | 'joinedAt'> {}
export interface GroupMemberOutput extends Required<GroupMemberAttributes> {}

class GroupMember extends Model<GroupMemberAttributes, GroupMemberInput> implements GroupMemberAttributes {
  public id!: number;
  public userId!: number;
  public groupId!: number;
  public status!: 'active' | 'pending' | 'rejected';
  public joinedAt!: Date | undefined;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

GroupMember.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'groups',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'pending', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    joinedAt: {
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
    tableName: 'group_members',
    modelName: 'GroupMember',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'groupId'],
      },
    ],
  }
);

export default GroupMember;
