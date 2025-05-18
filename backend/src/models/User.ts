import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { generateRandomBase36Code } from '../utils/codeGenerator';

interface UserAttributes {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserInput extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash' | 'googleId' | 'avatarUrl'> {}
export interface UserOutput extends Required<UserAttributes> {}

class User extends Model<UserAttributes, UserInput> implements UserAttributes {
  public id!: number;
  public firstName!: string;
  public lastName!: string;
  public email!: string;
  public passwordHash!: string | undefined;
  public googleId!: string | undefined;
  public avatarUrl!: string | undefined;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Utility function to hide sensitive fields
  public toSafeObject(): Partial<UserOutput> {
    const { id, firstName, lastName, email, avatarUrl, createdAt, updatedAt } = this.toJSON();
    return { id, firstName, lastName, email, avatarUrl, createdAt, updatedAt };
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    googleId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    avatarUrl: {
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
    tableName: 'users',
    modelName: 'User',
  }
);

export default User;
