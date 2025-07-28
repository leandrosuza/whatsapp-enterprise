import { sequelize } from '../config/database';
import User from './User';
import Contact from './Contact';
import WhatsAppProfile from './WhatsAppProfile';

// Define associations
export function initializeAssociations() {
  // User associations
  User.hasMany(Contact, { foreignKey: 'userId', as: 'contacts' });
  Contact.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // WhatsApp Profile associations
  User.hasMany(WhatsAppProfile, { foreignKey: 'userId', as: 'whatsappProfiles' });
  WhatsAppProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });
}

export { User, Contact, WhatsAppProfile };
export default sequelize; 