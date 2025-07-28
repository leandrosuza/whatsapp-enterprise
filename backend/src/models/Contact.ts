import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

interface ContactAttributes {
  id: number;
  userId: number;
  whatsappId: string;
  name: string;
  phone: string;
  email?: string;
  tags: string[];
  category: 'lead' | 'customer' | 'prospect';
  status: 'active' | 'inactive' | 'blocked';
  notes?: string;
  lastContact?: Date;
  metadata: {
    source?: string;
    campaign?: string;
    score?: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

interface ContactCreationAttributes extends Optional<ContactAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Contact extends Model<ContactAttributes, ContactCreationAttributes> implements ContactAttributes {
  public id!: number;
  public userId!: number;
  public whatsappId!: string;
  public name!: string;
  public phone!: string;
  public email?: string;
  public tags!: string[];
  public category!: 'lead' | 'customer' | 'prospect';
  public status!: 'active' | 'inactive' | 'blocked';
  public notes?: string;
  public lastContact?: Date;
  public metadata!: {
    source?: string;
    campaign?: string;
    score?: number;
  };

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Contact.init(
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
        model: User,
        key: 'id',
      },
    },
    whatsappId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    category: {
      type: DataTypes.ENUM('lead', 'customer', 'prospect'),
      allowNull: false,
      defaultValue: 'lead',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'blocked'),
      allowNull: false,
      defaultValue: 'active',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastContact: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,
    tableName: 'contacts',
  }
);

// Associations
Contact.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Contact, { foreignKey: 'userId' });

export default Contact; 