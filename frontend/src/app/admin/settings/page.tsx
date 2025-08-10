'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../../../contexts/AppContext';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const settingsSections: SettingsSection[] = [
  {
    id: 'general',
    title: 'General Settings',
    description: 'Basic application settings and preferences',
    icon: 'fas fa-cog',
    color: 'blue'
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Configuration',
    description: 'WhatsApp API settings and connection options',
    icon: 'fab fa-whatsapp',
    color: 'green'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Configure notification preferences and alerts',
    icon: 'fas fa-bell',
    color: 'orange'
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    description: 'Security settings and privacy controls',
    icon: 'fas fa-shield-alt',
    color: 'red'
  }
];

export default function SettingsPage() {
  const { setCurrentView, currentView } = useApp();
  const [activeSection, setActiveSection] = useState<string>('general');
  const [settings, setSettings] = useState({
    general: {
      companyName: 'WhatsApp Enterprise',
      timezone: 'America/Sao_Paulo',
      language: 'pt-BR'
    },
    whatsapp: {
      apiKey: '••••••••••••••••••••••••••••••••',
      webhookUrl: 'https://api.example.com/webhook',
      autoReply: true
    },
    notifications: {
      email: true,
      push: true,
      newMessage: true
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30
    }
  });

  useEffect(() => {
    // Evitar loop infinito - só definir a view se não estiver já definida
    if (currentView !== 'settings') {
      setCurrentView('settings');
    }
  }, []); // Remover setCurrentView das dependências

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'green': return 'bg-green-100 text-green-600 border-green-200';
      case 'orange': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'red': return 'bg-red-100 text-red-600 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const handleSettingChange = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value
      }
    }));
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
        <input
          type="text"
          value={settings.general.companyName}
          onChange={(e) => handleSettingChange('general', 'companyName', e.target.value)}
          className="input-enhanced w-full"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
          <select
            value={settings.general.timezone}
            onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
            className="input-enhanced w-full"
          >
            <option value="America/Sao_Paulo">America/Sao_Paulo</option>
            <option value="America/New_York">America/New_York</option>
            <option value="Europe/London">Europe/London</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
          <select
            value={settings.general.language}
            onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
            className="input-enhanced w-full"
          >
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en-US">English (US)</option>
            <option value="es-ES">Español</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderWhatsAppSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp API Key</label>
        <input
          type="password"
          value={settings.whatsapp.apiKey}
          onChange={(e) => handleSettingChange('whatsapp', 'apiKey', e.target.value)}
          className="input-enhanced w-full"
          placeholder="Enter your WhatsApp API key"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
        <input
          type="url"
          value={settings.whatsapp.webhookUrl}
          onChange={(e) => handleSettingChange('whatsapp', 'webhookUrl', e.target.value)}
          className="input-enhanced w-full"
          placeholder="https://your-domain.com/webhook"
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700">Auto Reply</label>
          <p className="text-xs text-gray-500">Automatically reply to messages outside business hours</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.whatsapp.autoReply}
            onChange={(e) => handleSettingChange('whatsapp', 'autoReply', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
        </label>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Notification Channels</h4>
        
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-700">Email Notifications</span>
            <p className="text-xs text-gray-500">Receive notifications via email</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifications.email}
              onChange={(e) => handleSettingChange('notifications', 'email', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-700">Push Notifications</span>
            <p className="text-xs text-gray-500">Receive push notifications in browser</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifications.push}
              onChange={(e) => handleSettingChange('notifications', 'push', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-700">New Message Alerts</span>
            <p className="text-xs text-gray-500">Notify when new messages arrive</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifications.newMessage}
              onChange={(e) => handleSettingChange('notifications', 'newMessage', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-gray-700">Two-Factor Authentication</span>
          <p className="text-xs text-gray-500">Add an extra layer of security to your account</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.security.twoFactorAuth}
            onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
        </label>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
        <select
          value={settings.security.sessionTimeout}
          onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
          className="input-enhanced w-full"
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={120}>2 hours</option>
        </select>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'general':
        return renderGeneralSettings();
      case 'whatsapp':
        return renderWhatsAppSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'security':
        return renderSecuritySettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">Configure your WhatsApp Enterprise settings</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="btn-secondary flex items-center space-x-2">
                <i className="fas fa-undo text-sm"></i>
                <span>Reset to Default</span>
              </button>
              <button className="btn-primary flex items-center space-x-2">
                <i className="fas fa-save text-sm"></i>
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>
              <nav className="space-y-2">
                {settingsSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                      activeSection === section.id
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getColorClasses(section.color)}`}>
                      <i className={`${section.icon} text-sm`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{section.title}</p>
                      <p className="text-xs text-gray-500 truncate">{section.description}</p>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {settingsSections.find(s => s.id === activeSection)?.title}
                </h2>
                <p className="text-gray-600 mt-1">
                  {settingsSections.find(s => s.id === activeSection)?.description}
                </p>
              </div>
              
              {renderSectionContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 