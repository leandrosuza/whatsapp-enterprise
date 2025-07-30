import { sequelize } from '../config/database';

async function addProfilePhotoColumn() {
  try {
    console.log('Adding profilePhoto column to whatsapp_profiles table...');
    
    await sequelize.query(`
      ALTER TABLE whatsapp_profiles 
      ADD COLUMN profilePhoto TEXT;
    `);
    
    console.log('profilePhoto column added successfully!');
  } catch (error) {
    console.error('Error adding profilePhoto column:', error);
  } finally {
    await sequelize.close();
  }
}

addProfilePhotoColumn(); 