import { Sequelize } from 'sequelize';
import * as path from 'path';
import * as fs from 'fs';

const DB_PATH = process.env.DB_PATH || './database/whatsapp_enterprise.sqlite';
const DB_SYNC = process.env.DB_SYNC === 'true';
const DB_LOGGING = process.env.DB_LOGGING === 'true';

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: DB_LOGGING ? console.log : false,
  define: {
    timestamps: true,
    underscored: true
  }
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ SQLite database connected successfully');

    if (DB_SYNC) {
      await sequelize.sync({ force: false });
      console.log('✅ Database synchronized');
    }
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Database disconnection error:', error);
  }
}; 