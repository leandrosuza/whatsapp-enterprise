'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { ProtectedRoute } from '../../shared/components/ProtectedRoute';
import { AppProvider, useApp } from '../../contexts/AppContext';
import DynamicContent from '../../shared/components/DynamicContent';
import AdminHeader from '../../shared/components/AdminHeader';
import './admin.css';

const navigation = [
  { name: 'Dashboard', href: '/admin/home', icon: 'fas fa-tachometer-alt' },
  { name: 'Conversations', href: '/admin/conversations', icon: 'fas fa-comments' },
  { 
    name: 'Contacts', 
    icon: 'fas fa-users',
    hasDropdown: true,
    subItems: [
      { name: 'Contact Manager', href: '/admin/contacts', icon: 'fas fa-user-cog' },
      { name: 'Contacts Explorer', href: '/admin/lead-generator', icon: 'fas fa-search' },
    ]
  },

  { name: 'Automations', href: '/admin/automations', icon: 'fas fa-robot' },
  { name: 'Analytics', href: '/admin/analytics', icon: 'fas fa-chart-line' },
  { name: 'Settings', href: '/admin/settings', icon: 'fas fa-cog' },
];

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const { setCurrentView } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  // No automatic pathname synchronization to prevent loops
  // Navigation is handled by the menu links and breadcrumbs

  const handleSignOut = () => {
    logout();
    router.push('/admin/login');
  };

  // Don't render admin layout for login page - just return children directly
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="bg-gray-100 font-sans">
          <div className="flex h-screen overflow-hidden">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
              <div 
                className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } md:flex md:flex-shrink-0`}>
              <div className="flex flex-col w-64 whatsapp-gradient text-white h-full relative overflow-hidden sidebar-glow bubble-container">
                {/* Animated background elements */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full blur-xl animate-pulse floating"></div>
                  <div className="absolute bottom-20 right-10 w-16 h-16 bg-white rounded-full blur-lg animate-pulse delay-1000 floating-delay-1"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white rounded-full blur-2xl animate-pulse delay-500 floating-delay-2"></div>
                </div>
                
                {/* Floating Bubbles */}
                <div className="floating-bubbles">
                  <div className="bubble-1"></div>
                  <div className="bubble-2"></div>
                  <div className="bubble-3"></div>
                </div>
                
                {/* Enhanced Header */}
                <div className="relative z-10 flex items-center justify-between h-20 px-6 border-b border-white border-opacity-20 bg-gradient-to-r from-white/10 to-transparent backdrop-blur-sm">
                  <div className="flex items-center space-x-3">
                    {/* Animated Logo */}
                    <div className="relative logo-container">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-all duration-300 border-glow">
                        <i className="fab fa-whatsapp text-2xl text-green-600 icon-bounce"></i>
                      </div>
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-white rounded-2xl blur-md opacity-30 animate-pulse logo-glow"></div>
                    </div>
                    
                    {/* Brand Text */}
                    <div className="flex flex-col">
                      <span className="text-xl font-bold tracking-wide text-white drop-shadow-lg gradient-text text-glow">
                        WhatsApp
                      </span>
                      <span className="text-xs font-medium text-white/80 tracking-wider uppercase">
                        Enterprise
                      </span>
                    </div>
                  </div>
                  
                  {/* Close button for mobile */}
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="md:hidden p-2 rounded-xl hover:bg-white/10 transition-all duration-300 ripple"
                  >
                    <i className="fas fa-times text-lg"></i>
                  </button>
                </div>
                
                {/* Navigation Content */}
                <div className="flex flex-col flex-grow overflow-y-auto scrollbar-hide relative z-10">
                  <div className="px-6 py-8">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-lg font-semibold text-white/90 tracking-wide text-glow">Menu</h2>
                      <div className="w-8 h-0.5 bg-white/30 rounded-full"></div>
                    </div>
                    
                    {/* Navigation Items */}
                    <nav className="space-y-1">
                      {navigation.map((item, index) => {
                        const isActive = pathname === item.href || (item.hasDropdown && item.subItems?.some(subItem => pathname === subItem.href));
                        const isDropdownOpen = openDropdown === item.name;
                        
                        return (
                          <div key={item.name} className="relative">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.hasDropdown) {
                                  setOpenDropdown(isDropdownOpen ? null : item.name);
                                } else {
                                  setSidebarOpen(false);
                                  setOpenDropdown(null);
                                  if (item.href) {
                                    router.push(item.href);
                                  }
                                  // Update view based on clicked item
                                  if (item.href === '/admin/home') {
                                    setCurrentView('dashboard');
                                  } else if (item.href === '/admin/conversations') {
                                    setCurrentView('conversations');
                                  } else if (item.href === '/admin/automations') {
                                    setCurrentView('automations');
                                  } else if (item.href === '/admin/analytics') {
                                    setCurrentView('analytics');
                                  } else if (item.href === '/admin/settings') {
                                    setCurrentView('settings');
                                  }
                                }
                              }}
                              className={`sidebar-item group flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-300 ripple w-full text-left click-animation relative overflow-hidden ${
                                isActive ? 'active bg-white/25 shadow-lg border-glow' : 'hover:bg-white/15'
                              } ${item.hasDropdown ? 'cursor-pointer' : ''}`}
                              style={{ 
                                animationDelay: `${index * 100}ms`,
                                userSelect: 'none',
                                cursor: 'pointer',
                                caretColor: 'transparent',
                                WebkitUserSelect: 'none',
                                MozUserSelect: 'none',
                                msUserSelect: 'none',
                                WebkitTouchCallout: 'none',
                                WebkitTapHighlightColor: 'transparent',
                                outline: 'none',
                                border: 'none',
                                background: 'transparent',
                                fontFamily: 'inherit',
                                fontSize: 'inherit',
                                color: 'inherit',
                                textDecoration: 'none'
                              }}
                              tabIndex={0}
                              role="button"
                              aria-label={item.name}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  if (item.hasDropdown) {
                                    setOpenDropdown(isDropdownOpen ? null : item.name);
                                  } else {
                                    if (item.href) {
                                      router.push(item.href);
                                    }
                                  }
                                }
                              }}
                            >
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 transition-all duration-500 ease-out ${
                                isActive 
                                  ? 'bg-green-400 text-white shadow-lg shadow-green-400/50' 
                                  : 'bg-white/10 text-white group-hover:bg-white/20 group-hover:text-white'
                              }`}>
                                <i className={`${item.icon} text-lg transition-all duration-300 ${isActive ? 'text-white' : ''}`}></i>
                              </div>
                              <div 
                                className={`font-medium transition-all duration-300 flex-1 ${
                                  isActive ? 'text-white text-glow' : 'text-white group-hover:text-white'
                                }`}
                                style={{
                                  userSelect: 'none',
                                  pointerEvents: 'none',
                                  cursor: 'default',
                                  caretColor: 'transparent',
                                  WebkitUserSelect: 'none',
                                  MozUserSelect: 'none',
                                  msUserSelect: 'none',
                                  WebkitTouchCallout: 'none',
                                  WebkitTapHighlightColor: 'transparent',
                                  outline: 'none',
                                  border: 'none',
                                  background: 'transparent',
                                  display: 'inline-block'
                                }}
                                contentEditable="false"
                              suppressContentEditableWarning={true}
                            >
                              {item.name}
                            </div>
                            
                            {/* Dropdown arrow for items with dropdown */}
                            {item.hasDropdown && (
                              <div className={`ml-2 dropdown-arrow ${isDropdownOpen ? 'rotated' : ''}`}>
                                <i className="fas fa-chevron-down text-xs text-white transition-transform duration-300"></i>
                              </div>
                            )}
                            
                            {/* Active indicator */}
                            {isActive && !item.hasDropdown && (
                              <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            )}
                          </div>
                          
                                                    {/* Dropdown submenu */}
                          {item.hasDropdown && (
                            <div className={`sidebar-dropdown ${isDropdownOpen ? 'sidebar-dropdown-enter-active' : 'sidebar-dropdown-exit-active'}`}>
                              <div className="mt-2 ml-4 space-y-1 bg-white/5 rounded-lg p-2 border border-white/10">
                                {isDropdownOpen && item.subItems?.map((subItem, subIndex) => {
                                  const isSubActive = pathname === subItem.href;
                                  return (
                                    <div
                                      key={subItem.name}
                                      className={`dropdown-submenu-item sidebar-item group flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-300 ripple w-full text-left click-animation ${
                                        isSubActive ? 'active bg-white/20 shadow-md border-glow' : 'hover:bg-white/10'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(subItem.href);
                                        if (subItem.href === '/admin/lead-generator') {
                                          setCurrentView('lead-generator');
                                        } else {
                                          setCurrentView('contacts');
                                        }
                                      }}
                                    style={{ 
                                      animationDelay: `${(index * 100) + (subIndex * 50)}ms`,
                                      userSelect: 'none',
                                      cursor: 'pointer',
                                      caretColor: 'transparent',
                                      WebkitUserSelect: 'none',
                                      MozUserSelect: 'none',
                                      msUserSelect: 'none',
                                      WebkitTouchCallout: 'none',
                                      WebkitTapHighlightColor: 'transparent',
                                      outline: 'none',
                                      border: 'none',
                                      background: 'transparent',
                                      fontFamily: 'inherit',
                                      fontSize: 'inherit',
                                      color: 'inherit',
                                      textDecoration: 'none'
                                    }}
                                    tabIndex={0}
                                    role="button"
                                    aria-label={subItem.name}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        router.push(subItem.href);
                                      }
                                    }}
                                  >
                                                                          <div className={`w-8 h-8 rounded-md flex items-center justify-center mr-3 transition-all duration-500 ease-out ${
                                        isSubActive 
                                          ? 'bg-green-400 text-white shadow-md shadow-green-400/50' 
                                          : 'bg-white/10 text-white group-hover:bg-white/20 group-hover:text-white'
                                      }`}>
                                        <i className={`${subItem.icon} text-sm transition-all duration-300 ${isSubActive ? 'text-white' : ''}`}></i>
                                      </div>
                                      {isSubActive && (
                                        <div className="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                      )}
                                    <div 
                                      className={`font-medium transition-all duration-300 ${
                                        isSubActive ? 'text-white text-glow' : 'text-white group-hover:text-white'
                                      }`}
                                      style={{
                                        userSelect: 'none',
                                        pointerEvents: 'none',
                                        cursor: 'default',
                                        caretColor: 'transparent',
                                        WebkitUserSelect: 'none',
                                        MozUserSelect: 'none',
                                        msUserSelect: 'none',
                                        WebkitTouchCallout: 'none',
                                        WebkitTapHighlightColor: 'transparent',
                                        outline: 'none',
                                        border: 'none',
                                        background: 'transparent',
                                        // spellCheck: 'false',
                                        display: 'inline-block'
                                      }}
                                      contentEditable="false"
                                      suppressContentEditableWarning={true}
                                                                         >
                                       {subItem.name}
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
                           </div>
                         )}
                        </div>
                      );
                    })}
                  </nav>
                  </div>
                  
                  {/* Enhanced Plan Status */}
                  <div className="px-6 py-6 mt-auto">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl plan-card">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-white text-glow">Current Plan</h3>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                      <div className="mb-3">
                        <p className="text-xs font-medium text-white mb-1">Premium Plan</p>
                                                  <p className="text-xs text-white">5 WhatsApp Numbers</p>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-white mb-2">
                          <span>Usage</span>
                          <span>3/5 active</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-green-300 h-2 rounded-full transition-all duration-1000 ease-out relative"
                            style={{ width: '60%' }}
                          >
                            <div className="absolute inset-0 bg-white/30 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Status indicator */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-xs text-white">Active</span>
                        </div>
                        <button className="text-xs text-white hover:text-white transition-colors ripple">
                          Upgrade
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Top Navigation */}
              <AdminHeader onMenuClick={() => setSidebarOpen(true)} />

              {/* Content */}
              <main className="flex-1 overflow-y-auto">
                <DynamicContent />
              </main>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  export default function AdminLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <AppProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </AppProvider>
    );
  } 