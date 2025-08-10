import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../infrastructure/database/database';

interface DDDAttributes {
  id: number;
  ddd: string;
  state: string;
  stateCode: string;
  region: string;
  regionCode: string;
  cities: string[];
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DDDCreationAttributes extends Optional<DDDAttributes, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> {}

class DDD extends Model<DDDAttributes, DDDCreationAttributes> implements DDDAttributes {
  public id!: number;
  public ddd!: string;
  public state!: string;
  public stateCode!: string;
  public region!: string;
  public regionCode!: string;
  public cities!: string[];
  public description?: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DDD.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ddd: {
      type: DataTypes.STRING(2),
      allowNull: false,
      unique: true,
      validate: {
        len: [2, 2],
        isNumeric: true,
      },
    },
    state: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    stateCode: {
      type: DataTypes.STRING(2),
      allowNull: false,
    },
    region: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    regionCode: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    cities: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'ddds',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['ddd'],
      },
      {
        fields: ['state'],
      },
      {
        fields: ['region'],
      },

    ],
  }
);

export default DDD; 