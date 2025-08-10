'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

interface WhatsAppProfile {
  id: number;
  name: string;
  status: string;
  isConnected: boolean;
  photo?: string;
}

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [whatsappProfiles, setWhatsappProfiles] = useState<WhatsAppProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<WhatsAppProfile | null>(null);
  const [dropdownAnimation, setDropdownAnimation] = useState<'closing' | 'opening' | 'closed' | 'open'>('closed');
  const { user, logout } = useAuth();
  const { currentView, subView, setCurrentView, setSubView } = useApp();

  // Load WhatsApp profiles
  useEffect(() => {
    const loadWhatsAppProfiles = async () => {
      try {
        const response = await fetch('/api/whatsapp/profiles');
        if (response.ok) {
          const data = await response.json();
          const profiles = Array.isArray(data) ? data : (data.profiles || []);
          
          // Map data to correct format
          const mappedProfiles = profiles.map((p: any) => {
            // Check if profile is connected based on multiple criteria
            const isConnected = p.isConnected || 
                               p.status === 'connected' || 
                               p.dbIsConnected || 
                               p.hasActiveClient ||
                               p.clientDataStatus === 'connected';
            
            return {
              id: p.id,
              name: p.name || `Profile ${p.id}`,
              status: p.status || 'disconnected',
              isConnected: isConnected,
              photo: p.photo || p.profilePhoto || 'https://randomuser.me/api/portraits/men/1.jpg'
            };
          });
          
          console.log('📱 WhatsApp profiles loaded:', mappedProfiles);
          
          // Find active profile (connected)
          const connectedProfile = mappedProfiles.find(p => p.isConnected);
          
          setWhatsappProfiles(mappedProfiles);
          setActiveProfile(connectedProfile || mappedProfiles[0] || null);
        }
      } catch (error) {
        console.error('Error loading WhatsApp profiles:', error);
      }
    };

    loadWhatsAppProfiles();
    
    // Update every 10 seconds for better detection
    const interval = setInterval(loadWhatsAppProfiles, 10000);
    return () => clearInterval(interval);
  }, []);

  // Add dynamic CSS styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes dropdownOpen {
        0% {
          opacity: 0;
          transform: scale(0.95) translateY(-10px);
          filter: blur(4px);
        }
        50% {
          opacity: 0.8;
          transform: scale(0.98) translateY(-5px);
          filter: blur(2px);
        }
        100% {
          opacity: 1;
          transform: scale(1) translateY(0);
          filter: blur(0);
        }
      }
      
      @keyframes dropdownClose {
        0% {
          opacity: 1;
          transform: scale(1) translateY(0);
          filter: blur(0);
        }
        50% {
          opacity: 0.8;
          transform: scale(0.98) translateY(-5px);
          filter: blur(2px);
        }
        100% {
          opacity: 0;
          transform: scale(0.95) translateY(-10px);
          filter: blur(4px);
        }
      }
      
      @keyframes sectionSlideIn {
        0% {
          opacity: 0;
          transform: translateX(20px);
        }
        100% {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      .dropdown-opening {
        animation: dropdownOpen 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      
      .dropdown-closing {
        animation: dropdownClose 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      
      .dropdown-item:hover {
        background: linear-gradient(135deg, rgba(37, 211, 102, 0.05) 0%, rgba(37, 211, 102, 0.02) 100%);
        transform: translateX(4px);
        box-shadow: 0 4px 12px rgba(37, 211, 102, 0.1);
      }
      
      .dropdown-item:hover .dropdown-item-text {
        color: #25D366;
      }
      
      .dropdown-item:hover .dropdown-item-subtitle {
        color: #059669;
      }
      
      .dropdown-item:hover .dropdown-item-arrow {
        opacity: 1;
        transform: translateX(0);
        color: #25D366;
      }
      
      .dropdown-item:hover .dropdown-item-icon {
        background: rgba(37, 211, 102, 0.15);
        transform: scale(1.1);
      }
      
      .dropdown-item.text-red-600:hover {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.02) 100%);
      }
      
      .dropdown-item.text-red-600:hover .dropdown-item-text {
        color: #dc2626;
      }
      
      .dropdown-item.text-red-600:hover .dropdown-item-subtitle {
        color: #b91c1c;
      }
      
      .dropdown-item.text-red-600:hover .dropdown-item-arrow {
        color: #dc2626;
      }

      .whatsapp-profile-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border-radius: 8px;
        margin: 2px 0;
        transition: all 0.2s ease;
        cursor: pointer;
      }

      .whatsapp-profile-item:hover {
        background: rgba(37, 211, 102, 0.1);
      }

      .whatsapp-profile-item.active {
        background: rgba(37, 211, 102, 0.15);
        border: 1px solid rgba(37, 211, 102, 0.3);
      }

      .whatsapp-profile-item.disconnected {
        opacity: 0.6;
      }

      .whatsapp-profile-item.disconnected:hover {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Control dropdown animation
  useEffect(() => {
    if (profileDropdownOpen) {
      setDropdownAnimation('opening');
      const timer = setTimeout(() => setDropdownAnimation('open'), 300);
      return () => clearTimeout(timer);
    } else {
      setDropdownAnimation('closing');
      const timer = setTimeout(() => setDropdownAnimation('closed'), 300);
      return () => clearTimeout(timer);
    }
  }, [profileDropdownOpen]);

  const getHeaderContent = () => {
    // Check if we're in a subView within dashboard
    if (currentView === 'dashboard' && subView === 'whatsapp-view') {
      return {
        title: 'WhatsApp View',
        subtitle: 'Manage conversations and messages',
        showBackButton: true,
        breadcrumbs: ['Dashboard', 'WhatsApp View']
      };
    }

    switch (currentView) {
      case 'dashboard':
        return {
          title: 'Admin Dashboard',
          subtitle: 'Welcome back, Administrator!',
          showBackButton: false,
          breadcrumbs: ['Dashboard']
        };
      case 'conversations':
        return {
          title: 'Conversations',
          subtitle: 'Manage and monitor all your WhatsApp conversations',
          showBackButton: false,
          breadcrumbs: ['Dashboard', 'Conversations']
        };
      case 'contacts':
        return {
          title: 'Contacts',
          subtitle: 'Manage your WhatsApp contacts and groups',
          showBackButton: false,
          breadcrumbs: ['Dashboard', 'Contacts']
        };
      case 'lead-generator':
        return {
          title: 'Contacts Explorer',
          subtitle: 'Find potential contacts on WhatsApp with precision',
          showBackButton: false,
          breadcrumbs: ['Dashboard', 'Contacts Explorer']
        };
      case 'automations':
        return {
          title: 'Automations',
          subtitle: 'Create and manage automated messaging workflows',
          showBackButton: false,
          breadcrumbs: ['Dashboard', 'Automations']
        };
      case 'analytics':
        return {
          title: 'Analytics',
          subtitle: 'View detailed insights and performance metrics',
          showBackButton: false,
          breadcrumbs: ['Dashboard', 'Analytics']
        };
      case 'settings':
        return {
          title: 'Settings',
          subtitle: 'Configure your WhatsApp Enterprise settings',
          showBackButton: false,
          breadcrumbs: ['Dashboard', 'Settings']
        };
      default:
        return {
          title: 'Admin Panel',
          subtitle: 'Welcome back, Administrator!',
          showBackButton: false,
          breadcrumbs: ['Dashboard']
        };
    }
  };

  const headerContent = getHeaderContent();

  const handleLogout = () => {
    logout();
    setProfileDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  const handleProfileChange = (profile: WhatsAppProfile) => {
    console.log('🔄 Changing active profile to:', profile.name, 'Connected:', profile.isConnected);
    setActiveProfile(profile);
    setProfileDropdownOpen(false);
  };

  const forceRefreshProfiles = () => {
    console.log('🔄 Forcing profile update...');
    const loadWhatsAppProfiles = async () => {
      try {
        const response = await fetch('/api/whatsapp/profiles');
        if (response.ok) {
          const data = await response.json();
          const profiles = Array.isArray(data) ? data : (data.profiles || []);
          
          const mappedProfiles = profiles.map((p: any) => {
            const isConnected = p.isConnected || 
                               p.status === 'connected' || 
                               p.dbIsConnected || 
                               p.hasActiveClient ||
                               p.clientDataStatus === 'connected';
            
            return {
              id: p.id,
              name: p.name || `Profile ${p.id}`,
              status: p.status || 'disconnected',
              isConnected: isConnected,
              photo: p.photo || p.profilePhoto || 'https://randomuser.me/api/portraits/men/1.jpg'
            };
          });
          
          console.log('📱 Profiles updated:', mappedProfiles);
          
          const connectedProfile = mappedProfiles.find(p => p.isConnected);
          
          setWhatsappProfiles(mappedProfiles);
          setActiveProfile(connectedProfile || mappedProfiles[0] || null);
        }
      } catch (error) {
        console.error('Error updating profiles:', error);
      }
    };
    
    loadWhatsAppProfiles();
  };

  const getProfileDisplay = () => {
    // Always show logged user data in the system
    return {
      photo: 'https://randomuser.me/api/portraits/men/1.jpg', // Default user avatar
      name: user?.name || 'Administrator',
      status: 'Online', // User system status
      statusColor: 'bg-green-500', // Green for online user
      isWhatsAppProfile: false // Always false for system user
    };
  };

  const profileDisplay = getProfileDisplay();

  return (
    <div className="header-transition flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="md:hidden mr-3 p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
          title="Open Menu"
        >
          <i className="fas fa-bars text-lg"></i>
        </button>
        
        {headerContent.showBackButton && (
          <button 
            onClick={() => {
              console.log('🔙 Back button clicked, returning to dashboard');
              setSubView('none');
            }}
            className="back-button-nav mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            title="Back to Dashboard"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
        )}
        <div>
          <h1 className="header-title text-xl font-semibold text-gray-800">{headerContent.title}</h1>
          {/* Breadcrumbs */}
          <div className="flex items-center text-sm text-gray-500">
            {headerContent.breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && (
                  <i className="fas fa-chevron-right mx-2 text-gray-300"></i>
                )}
                {crumb === 'Dashboard' ? (
                  <button
                    onClick={() => {
                      console.log('🏠 Dashboard breadcrumb clicked');
                      setCurrentView('dashboard');
                      setSubView('none');
                    }}
                    className="hover:text-gray-700 cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {crumb}
                  </button>
                ) : (
                  <span className={index === headerContent.breadcrumbs.length - 1 ? 'text-gray-700 font-medium' : 'hover:text-gray-700 cursor-pointer'}>
                    {crumb}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        {/* Search bar */}
        <div className="hidden md:block relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i className="fas fa-search text-gray-400"></i>
          </div>
          <input
            type="text"
            placeholder="Search..."
            className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
          />
        </div>
        
        {/* Notifications */}
        <div className="relative">
          <button className="notification-button p-2 rounded-lg" style={{ backgroundColor: 'transparent' }}>
            <i className="fas fa-bell" style={{ color: '#6b7280' }}></i>
            <span className="notification-badge">3</span>
          </button>
        </div>
        
        {/* User profile dropdown */}
        <div className="relative">
          <button 
            onClick={toggleDropdown}
            className="flex items-center focus:outline-none p-2 rounded-lg hover:bg-gray-100 transition-all duration-300"
          >
            <div className="relative">
              <img className="w-8 h-8 rounded-full border-2 border-gray-200 hover:border-green-500 transition-colors duration-300" src={profileDisplay.photo} alt="User profile" />
              {profileDisplay.isWhatsAppProfile && (
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${profileDisplay.statusColor} border-2 border-white rounded-full animate-pulse`}></div>
              )}
            </div>
            <div className="ml-2 text-left hidden md:block">
              <div className="text-sm font-medium text-gray-700">{profileDisplay.name}</div>
              <div className="text-xs text-gray-500">{profileDisplay.status}</div>
            </div>
            <i className={`fas fa-chevron-down ml-2 text-gray-400 hidden md:inline transition-transform duration-300 ${profileDropdownOpen ? 'rotate-180' : ''}`}></i>
          </button>
          
          {/* Enhanced Dropdown menu with animations */}
          {dropdownAnimation !== 'closed' && (
            <div 
              className={`absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl py-2 z-50 border border-gray-200 overflow-hidden dropdown-enhanced ${
                dropdownAnimation === 'opening' ? 'dropdown-opening' : 
                dropdownAnimation === 'closing' ? 'dropdown-closing' : 
                'dropdown-open'
              }`}
              style={{
                backdropFilter: 'blur(10px)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transformOrigin: 'top right'
              }}
            >
              {/* Header Section */}
              <div 
                className="dropdown-section dropdown-header"
                style={{
                  opacity: 0,
                  transform: 'translateX(20px)',
                  animationName: 'sectionSlideIn',
                  animationDuration: '0.4s',
                  animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  animationFillMode: 'forwards',
                  animationDelay: '0.1s'
                }}
              >
                <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-green-50 to-blue-50">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img className="w-12 h-12 rounded-full border-2 border-green-500 shadow-lg" src={profileDisplay.photo} alt="User profile" />
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${profileDisplay.statusColor} border-2 border-white rounded-full animate-pulse`}></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-semibold text-gray-900">{profileDisplay.name}</p>
                        {profileDisplay.isWhatsAppProfile && (
                          <i className="fab fa-whatsapp text-green-500 ml-2 text-xs"></i>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{user?.email || 'admin@example.com'}</p>
                      <div className="flex items-center mt-1">
                        <div className={`w-2 h-2 ${profileDisplay.statusColor} rounded-full mr-2 animate-pulse`}></div>
                        <span className={`text-xs font-medium ${profileDisplay.isWhatsAppProfile ? 'text-green-600' : 'text-gray-600'}`}>
                          {profileDisplay.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* WhatsApp Profiles Section */}
              {whatsappProfiles.length > 0 && (
                <div 
                  className="dropdown-section dropdown-whatsapp"
                  style={{
                    opacity: 0,
                    transform: 'translateX(20px)',
                    animationName: 'sectionSlideIn',
                    animationDuration: '0.4s',
                    animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    animationFillMode: 'forwards',
                    animationDelay: '0.15s'
                  }}
                >
                  <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-green-50 to-blue-50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center">
                        <i className="fab fa-whatsapp text-green-500 mr-2"></i>
                        WhatsApp Web.js Profiles
                      </h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={forceRefreshProfiles}
                          className="text-xs text-gray-500 hover:text-green-500 transition-colors"
                          title="Update profiles"
                        >
                          <i className="fas fa-sync-alt"></i>
                        </button>
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                          {whatsappProfiles.length}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {whatsappProfiles.map((profile) => (
                        <div
                          key={profile.id}
                          onClick={() => handleProfileChange(profile)}
                          className={`whatsapp-profile-item ${activeProfile?.id === profile.id ? 'active' : ''} ${!profile.isConnected ? 'disconnected' : ''}`}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: activeProfile?.id === profile.id ? '1px solid rgba(37, 211, 102, 0.3)' : '1px solid transparent',
                            background: activeProfile?.id === profile.id ? 'rgba(37, 211, 102, 0.1)' : 'transparent'
                          }}
                        >
                          <div className="relative">
                            <img 
                              src={profile.photo || 'https://randomuser.me/api/portraits/men/1.jpg'} 
                              alt={profile.name}
                              className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                            />
                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${profile.isConnected ? 'bg-green-500' : 'bg-gray-400'} border-2 border-white rounded-full`}></div>
                          </div>
                          <div className="flex-1 min-w-0 ml-3">
                            <div className="text-sm font-medium text-gray-700 truncate">{profile.name}</div>
                            <div className="text-xs text-gray-500 truncate flex items-center">
                              <span className={`w-2 h-2 ${profile.isConnected ? 'bg-green-500' : 'bg-gray-400'} rounded-full mr-2`}></span>
                              {profile.isConnected ? 'Connected' : 'Disconnected'}
                            </div>
                          </div>
                          {activeProfile?.id === profile.id && (
                            <i className="fas fa-check text-green-500 ml-2"></i>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Menu Items Section */}
              <div 
                className="dropdown-section dropdown-menu"
                style={{
                  opacity: 0,
                  transform: 'translateX(20px)',
                  animationName: 'sectionSlideIn',
                  animationDuration: '0.4s',
                  animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  animationFillMode: 'forwards',
                  animationDelay: '0.2s'
                }}
              >
                <a 
                  href="#" 
                  className="dropdown-item group"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    textDecoration: 'none',
                    color: '#374151',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '8px',
                    margin: '2px 8px'
                  }}
                >
                  <div 
                    className="dropdown-item-icon"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(37, 211, 102, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      transition: 'all 0.3s ease',
                      flexShrink: 0
                    }}
                  >
                    <i className="fas fa-user text-green-600"></i>
                  </div>
                  <div 
                    className="dropdown-item-content"
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <span 
                      className="dropdown-item-text"
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#1f2937',
                        transition: 'color 0.3s ease'
                      }}
                    >
                Profile
                    </span>
                    <span 
                      className="dropdown-item-subtitle"
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        marginTop: '2px',
                        transition: 'color 0.3s ease'
                      }}
                    >
                      View your profile
                    </span>
                  </div>
                  <i 
                    className="fas fa-chevron-right dropdown-item-arrow"
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      transition: 'all 0.3s ease',
                      opacity: 0,
                      transform: 'translateX(-10px)'
                    }}
                  ></i>
                </a>
                
                <a 
                  href="#" 
                  className="dropdown-item group"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    textDecoration: 'none',
                    color: '#374151',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '8px',
                    margin: '2px 8px'
                  }}
                >
                  <div 
                    className="dropdown-item-icon"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      transition: 'all 0.3s ease',
                      flexShrink: 0
                    }}
                  >
                    <i className="fas fa-cog text-blue-600"></i>
                  </div>
                  <div 
                    className="dropdown-item-content"
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <span 
                      className="dropdown-item-text"
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#1f2937',
                        transition: 'color 0.3s ease'
                      }}
                    >
                Settings
                    </span>
                    <span 
                      className="dropdown-item-subtitle"
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        marginTop: '2px',
                        transition: 'color 0.3s ease'
                      }}
                    >
                      Configure preferences
                    </span>
                  </div>
                  <i 
                    className="fas fa-chevron-right dropdown-item-arrow"
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      transition: 'all 0.3s ease',
                      opacity: 0,
                      transform: 'translateX(-10px)'
                    }}
                  ></i>
                </a>
                
                <a 
                  href="#" 
                  className="dropdown-item group"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    textDecoration: 'none',
                    color: '#374151',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '8px',
                    margin: '2px 8px'
                  }}
                >
                  <div 
                    className="dropdown-item-icon"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      transition: 'all 0.3s ease',
                      flexShrink: 0
                    }}
                  >
                    <i className="fas fa-bell text-yellow-600"></i>
                  </div>
                  <div 
                    className="dropdown-item-content"
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <span 
                      className="dropdown-item-text"
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#1f2937',
                        transition: 'color 0.3s ease'
                      }}
                    >
                      Notifications
                    </span>
                    <span 
                      className="dropdown-item-subtitle"
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        marginTop: '2px',
                        transition: 'color 0.3s ease'
                      }}
                    >
                      Manage alerts
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span 
                      className="bg-red-500 text-white text-xs rounded-full px-2 py-1 mr-2"
                      style={{
                        backgroundColor: '#ef4444',
                        color: 'white',
                        fontSize: '12px',
                        borderRadius: '9999px',
                        padding: '4px 8px',
                        marginRight: '8px'
                      }}
                    >
                      3
                    </span>
                    <i 
                      className="fas fa-chevron-right dropdown-item-arrow"
                      style={{
                        fontSize: '12px',
                        color: '#9ca3af',
                        transition: 'all 0.3s ease',
                        opacity: 0,
                        transform: 'translateX(-10px)'
                      }}
                    ></i>
                  </div>
                </a>
                
                <a 
                  href="#" 
                  className="dropdown-item group"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    textDecoration: 'none',
                    color: '#374151',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '8px',
                    margin: '2px 8px'
                  }}
                >
                  <div 
                    className="dropdown-item-icon"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(147, 51, 234, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      transition: 'all 0.3s ease',
                      flexShrink: 0
                    }}
                  >
                    <i className="fas fa-question-circle text-purple-600"></i>
                  </div>
                  <div 
                    className="dropdown-item-content"
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <span 
                      className="dropdown-item-text"
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#1f2937',
                        transition: 'color 0.3s ease'
                      }}
                    >
                      Help & Support
                    </span>
                    <span 
                      className="dropdown-item-subtitle"
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        marginTop: '2px',
                        transition: 'color 0.3s ease'
                      }}
                    >
                      Get assistance
                    </span>
                  </div>
                  <i 
                    className="fas fa-chevron-right dropdown-item-arrow"
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      transition: 'all 0.3s ease',
                      opacity: 0,
                      transform: 'translateX(-10px)'
                    }}
                  ></i>
                </a>
              </div>

              {/* Footer Section */}
              <div 
                className="dropdown-section dropdown-footer"
                style={{
                  opacity: 0,
                  transform: 'translateX(20px)',
                  animationName: 'sectionSlideIn',
                  animationDuration: '0.4s',
                  animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  animationFillMode: 'forwards',
                  animationDelay: '0.3s'
                }}
              >
              <div className="border-t border-gray-100">
                <button
                  onClick={handleLogout}
                    className="dropdown-item group text-red-600 hover:bg-red-50"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      textDecoration: 'none',
                      color: '#dc2626',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: '8px',
                      margin: '2px 8px',
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <div 
                      className="dropdown-item-icon"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px',
                        transition: 'all 0.3s ease',
                        flexShrink: 0
                      }}
                    >
                      <i className="fas fa-sign-out-alt text-red-600"></i>
                    </div>
                    <div 
                      className="dropdown-item-content"
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <span 
                        className="dropdown-item-text"
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#dc2626',
                          transition: 'color 0.3s ease'
                        }}
                      >
                  Sign out
                      </span>
                      <span 
                        className="dropdown-item-subtitle"
                        style={{
                          fontSize: '12px',
                          color: '#b91c1c',
                          marginTop: '2px',
                          transition: 'color 0.3s ease'
                        }}
                      >
                        Logout from account
                      </span>
                    </div>
                    <i 
                      className="fas fa-chevron-right dropdown-item-arrow"
                      style={{
                        fontSize: '12px',
                        color: '#dc2626',
                        transition: 'all 0.3s ease',
                        opacity: 0,
                        transform: 'translateX(-10px)'
                      }}
                    ></i>
                </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Click outside to close dropdown */}
      {profileDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setProfileDropdownOpen(false)}
        />
      )}
    </div>
  );
} 