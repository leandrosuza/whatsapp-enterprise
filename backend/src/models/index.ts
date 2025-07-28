import { sequelize } from '../config/database';
import User from './User';
import Contact from './Contact';

// Import all models here
// import Conversation from './Conversation';
// import Automation from './Automation';
// import Campaign from './Campaign';

// Export all models
export {
  User,
  Contact,
  // Conversation,
  // Automation,
  // Campaign,
};

// Export sequelize instance
export { sequelize };

// Initialize associations
export const initializeAssociations = () => {
  // User associations
  User.hasMany(Contact, { foreignKey: 'userId' });
  Contact.belongsTo(User, { foreignKey: 'userId' });

  // Add more associations here as models are created
  // User.hasMany(Conversation, { foreignKey: 'userId' });
  // User.hasMany(Automation, { foreignKey: 'userId' });
  // User.hasMany(Campaign, { foreignKey: 'userId' });
}; 