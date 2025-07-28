import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface WhatsAppProfileAttributes {
  id: number;
  userId: number;
  name: string;
  clientId: string;
  sessionPath: string;
  phoneNumber?: string;
  isConnected: boolean;
  isActive: boolean;
  lastConnected?: Date;
  lastDisconnected?: Date;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

interface WhatsAppProfileCreationAttributes extends Optional<WhatsAppProfileAttributes, 'id' | 'userId' | 'isConnected' | 'isActive' | 'status' | 'createdAt' | 'updatedAt'> {}

class WhatsAppProfile extends Model<WhatsAppProfileAttributes, WhatsAppProfileCreationAttributes> implements WhatsAppProfileAttributes {
  public id!: number;
  public userId!: number;
  public name!: string;
  public clientId!: string;
  public sessionPath!: string;
  public phoneNumber?: string;
  public isConnected!: boolean;
  public isActive!: boolean;
  public lastConnected?: Date;
  public lastDisconnected?: Date;
  public status!: 'connecting' | 'connected' | 'disconnected' | 'error';
  public metadata?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Static method to find by client ID
  public static async findByClientId(clientId: string): Promise<WhatsAppProfile | null> {
    return this.findOne({ where: { clientId } });
  }

  // Static method to find active profiles
  public static async findActive(): Promise<WhatsAppProfile[]> {
    return this.findAll({ where: { isActive: true } });
  }

  // Static method to find connected profiles
  public static async findConnected(): Promise<WhatsAppProfile[]> {
    return this.findAll({ where: { isConnected: true, isActive: true } });
  }

  // Instance method to mark as connected
  public async markConnected(phoneNumber?: string): Promise<void> {
    this.isConnected = true;
    this.status = 'connected';
    this.lastConnected = new Date();
    if (phoneNumber) {
      this.phoneNumber = phoneNumber;
    }
    await this.save();
  }

  // Instance method to mark as disconnected
  public async markDisconnected(): Promise<void> {
    this.isConnected = false;
    this.status = 'disconnected';
    this.lastDisconnected = new Date();
    await this.save();
  }

  // Instance method to mark as error
  public async markError(): Promise<void> {
    this.isConnected = false;
    this.status = 'error';
    this.lastDisconnected = new Date();
    await this.save();
  }

  // Instance method to toggle active status
  public async toggleActive(): Promise<void> {
    this.isActive = !this.isActive;
    if (!this.isActive) {
      this.isConnected = false;
      this.status = 'disconnected';
      this.lastDisconnected = new Date();
    }
    await this.save();
  }
}

WhatsAppProfile.init(
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    clientId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    sessionPath: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isConnected: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastConnected: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastDisconnected: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('connecting', 'connected', 'disconnected', 'error'),
      allowNull: false,
      defaultValue: 'disconnected',
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'whatsapp_profiles',
    timestamps: true,
  }
);

export default WhatsAppProfile; 