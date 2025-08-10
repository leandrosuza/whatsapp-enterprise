import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../infrastructure/database/database';
import User from './User';

interface TagAttributes {
  id: number;
  userId: number;
  name: string;
  color?: string;
  description?: string;
  isActive: boolean;
  usageCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TagCreationAttributes extends Optional<TagAttributes, 'id' | 'isActive' | 'usageCount' | 'createdAt' | 'updatedAt'> {}

class Tag extends Model<TagAttributes, TagCreationAttributes> implements TagAttributes {
  public id!: number;
  public userId!: number;
  public name!: string;
  public color?: string;
  public description?: string;
  public isActive!: boolean;
  public usageCount!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Tag.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: User,
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 50],
      },
    },
    color: {
      type: DataTypes.STRING(7), // Hex color code
      allowNull: true,
      validate: {
        is: /^#[0-9A-F]{6}$/i, // Hex color validation
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'usage_count',
    },
  },
  {
    sequelize,
    tableName: 'tags',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'name'], // User can't have duplicate tag names
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['is_active'],
      },
    ],
  }
);

export default Tag;
