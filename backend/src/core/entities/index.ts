import { sequelize } from '../../infrastructure/database/database';
import User from './User';
import Contact from './Contact';
import WhatsAppProfile from './WhatsAppProfile';
import DDD from './DDD';
import Tag from './Tag';

// Define associations
export function initializeAssociations() {
  // User associations
  User.hasMany(Contact, { foreignKey: 'userId', as: 'contacts' });
  Contact.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // WhatsApp Profile associations
  User.hasMany(WhatsAppProfile, { foreignKey: 'userId', as: 'whatsappProfiles' });
  WhatsAppProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Tag associations
  User.hasMany(Tag, { foreignKey: 'userId', as: 'tags' });
  Tag.belongsTo(User, { foreignKey: 'userId', as: 'user' });
}

export { User, Contact, WhatsAppProfile, DDD, Tag };
export default sequelize; 