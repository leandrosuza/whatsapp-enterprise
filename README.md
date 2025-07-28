# 📱 WhatsApp Enterprise

> **Intelligent WhatsApp Management System for Businesses**

A modern web platform that transforms WhatsApp into a powerful business tool, offering automation, artificial intelligence, and a complete administrative interface.

## 🚀 About the Project

**WhatsApp Enterprise** is a complete solution that combines:
- **🔄 Intelligent Automation** with integrated AI
- **📊 Advanced Management** of leads and conversations
- **📨 Bulk Messaging** with multiple numbers
- **🎨 Modern Interface** fully responsive
- **🔒 Robust Authentication** system and secure
- **🤖 WhatsApp Integration** with Web.js
- **👥 WhatsApp Profile Management**
- **📈 Analytics** and real-time reports

## 🛠️ Technologies

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript, SQLite
- **WhatsApp:** whatsapp-web.js, Puppeteer
- **Authentication:** JWT, bcrypt
- **Styling:** Glass morphism, CSS animations, modern gradients

## ⚡ How to Use

### 1. Quick Installation
```bash
# Clone the repository
git clone https://github.com/your-username/whatsapp-enterprise.git
cd whatsapp-enterprise

# Install dependencies
npm install

# Configure environment
cp backend/env.example backend/.env
cp frontend/env.local.example frontend/.env.local

# Create admin user
cd backend && npm run create-admin

# Start the project
npm run dev
```

### 2. Access the System
- **URL:** `http://localhost:3000/admin/login`
- **Email:** `admin@gmail.com`
- **Password:** `admin123`

## 🎯 Main Features

### ✅ Authentication System
- Secure login with JWT
- Role-based protection middleware
- Rate limiting and CORS configured
- Input validation on all routes

### ✅ Administrative Interface
- Modern and responsive design
- Reusable components
- Smooth animations and visual effects
- Mobile First with optimized navigation

### ✅ WhatsApp Integration
- Connection with WhatsApp Web.js
- Multiple profile management
- QR Code for authentication
- Real-time connection status
- Scheduled message sending

### ✅ Profile Management
- WhatsApp profile creation and editing
- Association with system users
- Connection history
- Custom settings

### ✅ Analytics and Reports
- Real-time metrics dashboard
- Sent message reports
- Performance statistics
- Data export

## 📱 Screenshots

### Login Screen
![Login Screen](docs/adminLoginHome.png)

### Administrative Dashboard
![Dashboard](docs/adminHome.png)

## 🔐 Security

- Passwords hashed with bcrypt
- JWT tokens with expiration
- Rate limiting and CORS configured
- Input validation on all routes
- Role-based protection middleware
- Secure WhatsApp sessions

## 🚀 Next Steps

- AI-powered automation system
- Advanced analytics and reports
- Complete REST API
- CRM integrations
- Intelligent chatbot
- Automated marketing campaigns

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

---

**Developed with ❤️ to revolutionize business communication**
