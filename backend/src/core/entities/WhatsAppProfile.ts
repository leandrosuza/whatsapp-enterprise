import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../infrastructure/database/database';

interface WhatsAppProfileAttributes {
  id: number;
  userId: number;
  name: string;
  clientId: string;
  sessionPath: string;
  phoneNumber?: string;
  profilePhoto?: string;
  isConnected: boolean;
  isActive: boolean;
  lastConnected?: Date;
  lastDisconnected?: Date;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  metadata?: any;
  // Campos de compartilhamento
  isShared?: boolean;
  shareToken?: string;
  shareUrl?: string;
  sharedAt?: Date;
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
  public profilePhoto?: string;
  public isConnected!: boolean;
  public isActive!: boolean;
  public lastConnected?: Date;
  public lastDisconnected?: Date;
  public status!: 'connecting' | 'connected' | 'disconnected' | 'error';
  public metadata?: any;
  // Campos de compartilhamento
  public isShared?: boolean;
  public shareToken?: string;
  public shareUrl?: string;
  public sharedAt?: Date;
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

  // Instance method to update profile photo
  public async updateProfilePhoto(photoUrl: string): Promise<void> {
    this.profilePhoto = photoUrl;
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
      field: 'user_id',
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
      field: 'client_id',
      validate: {
        notEmpty: true,
      },
    },
    sessionPath: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'session_path',
      validate: {
        notEmpty: true,
      },
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'phone_number',
    },
    profilePhoto: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'profilePhoto', // Explicitly set the field name to match the database column
    },
    isConnected: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_connected',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    lastConnected: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_connected',
    },
    lastDisconnected: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_disconnected',
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
    // Campos de compartilhamento
    isShared: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_shared',
    },
    shareToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'share_token',
    },
    shareUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'share_url',
    },
    sharedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'shared_at',
    },
  },
  {
    sequelize,
    tableName: 'whatsapp_profiles',
    timestamps: true,
  }
);

export default WhatsAppProfile; 