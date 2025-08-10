'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../../../contexts/AppContext';
import UserProfileAvatar from '../../../shared/components/UserProfileAvatar';
import { loadProfilesUtility, checkBackendAndLoadProfilesUtility } from '../../../shared/utils/profileUtils';

// WhatsApp number data
const whatsappNumbers = [
  {
    id: 1,
    number: '(11) 98765-4321',
    status: 'active',
    lastActive: '2h',
    conversations: 12,
    contacts: 1245,
    hours: 48,
    responded: 85,
    waiting: 15,
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
  },
  {
    id: 2,
    number: '(21) 99876-5432',
    status: 'active',
    lastActive: '45m',
    conversations: 8,
    contacts: 876,
    hours: 24,
    responded: 92,
    waiting: 8,
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
  },
  {
    id: 3,
    number: '(31) 98765-1234',
    status: 'inactive',
    lastActive: 'Inactive',
    conversations: 0,
    contacts: 1542,
    hours: 72,
    responded: 78,
    waiting: 22,
    avatar: 'https://randomuser.me/api/portraits/men/67.jpg'
  },
  {
    id: 4,
    number: '(41) 91234-5678',
    status: 'active',
    lastActive: '1h',
    conversations: 15,
    contacts: 2100,
    hours: 36,
    responded: 88,
    waiting: 12,
    avatar: 'https://randomuser.me/api/portraits/women/28.jpg'
  },
  {
    id: 5,
    number: '(51) 94567-8901',
    status: 'active',
    lastActive: '30m',
    conversations: 6,
    contacts: 890,
    hours: 60,
    responded: 95,
    waiting: 5,
    avatar: 'https://randomuser.me/api/portraits/men/45.jpg'
  }
];

// Recent activities data
const recentActivities = [
  {
    id: 1,
    type: 'message',
    number: '(11) 98765-4321',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    title: 'New message received',
    description: 'From: João Silva',
    content: 'Hello! I would like to know more about your products...',
    time: '2m ago',
    icon: 'fas fa-comment',
    color: 'green'
  },
  {
    id: 2,
    type: 'contact',
    number: '(21) 99876-5432',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    title: 'New contact added',
    description: 'Maria Santos',
    content: 'Added to campaign: Summer Sale',
    time: '15m ago',
    icon: 'fas fa-user-plus',
    color: 'blue'
  },
  {
    id: 3,
    type: 'automation',
    number: '(31) 98765-1234',
    avatar: 'https://randomuser.me/api/portraits/men/67.jpg',
    title: 'Automation triggered',
    description: 'Auto-response sent to 5 contacts',
    content: 'Campaign: Welcome new customers',
    time: '1h ago',
    icon: 'fas fa-robot',
    color: 'purple'
  },
  {
    id: 4,
    type: 'promotion',
    number: '(11) 98765-4321',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    title: 'Promotion sent',
    description: 'To: 42 segmented customers',
    content: 'Summer special offer',
    time: '3h ago',
    icon: 'fas fa-tag',
    color: 'yellow'
  }
];

interface WhatsAppProfile {
  id: number;
  name: string;
  phoneNumber?: string;
  isConnected: boolean;
  isActive: boolean;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastConnected?: string;
  lastDisconnected?: string;
  createdAt: string;
  profilePhoto?: string;
  isDisabled?: boolean;
}

export default function AdminHome() {
  const { currentView, setCurrentView, setSubView, setViewParams } = useApp();
  const [user, setUser] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [clientId, setClientId] = useState('');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [profiles, setProfiles] = useState<WhatsAppProfile[]>([]);
  const [modalState, setModalState] = useState<'input' | 'qr' | 'success' | 'error'>('input');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  
  // Estados para o modal de compartilhamento
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<WhatsAppProfile | null>(null);
  const [shareLink, setShareLink] = useState('');
  const [isSharingEnabled, setIsSharingEnabled] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // API base URL


  // Initialize component with proper function definitions
  useEffect(() => {
    let isMounted = true;
    
    // Load user data
    const userData = localStorage.getItem('admin-user');
    if (userData && isMounted) {
      setUser(JSON.parse(userData));
    }
    
    // Initial load using utility function
    const initialLoad = async () => {
      if (!isMounted) return;
      await checkBackendAndLoadProfilesUtility(setProfiles);
    };
    
    initialLoad();
    
    // Set up polling
    const statusInterval = setInterval(() => {
      if (isMounted) {
        checkBackendAndLoadProfilesUtility(setProfiles);
      }
    }, 5000);
    
    setPollingInterval(statusInterval);
    
    return () => {
      isMounted = false;
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };
  }, []); // Empty dependency array

  // Auto-refresh profiles when returning to dashboard
  useEffect(() => {
    // Detect when we return to the dashboard
    if (currentView === 'dashboard') {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTime;
      
      // Only refresh if it's been more than 2 seconds since last refresh
      // This prevents excessive API calls when the component mounts
      if (timeSinceLastRefresh > 2000) {
        console.log('🔄 Dashboard detected - Auto-refreshing profiles...');
        
        const refreshProfiles = async () => {
          try {
            await checkBackendAndLoadProfilesUtility(setProfiles);
            setLastRefreshTime(now);
            console.log('✅ Profiles refreshed successfully');
          } catch (error) {
            console.error('❌ Error refreshing profiles:', error);
          }
        };
        
        refreshProfiles();
      }
    }
  }, [currentView, lastRefreshTime]); // Depend on currentView changes

  // Auto-refresh profiles when tab/window becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      // Only refresh if we're on the dashboard and the page becomes visible
      if (currentView === 'dashboard' && !document.hidden) {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshTime;
        
        // Only refresh if it's been more than 5 seconds since last refresh
        // This prevents excessive API calls when switching tabs quickly
        if (timeSinceLastRefresh > 5000) {
          console.log('🔄 Tab became visible - Auto-refreshing profiles...');
          
          try {
            await checkBackendAndLoadProfilesUtility(setProfiles);
            setLastRefreshTime(now);
            console.log('✅ Profiles refreshed after tab visibility change');
          } catch (error) {
            console.error('❌ Error refreshing profiles after visibility change:', error);
          }
        }
      }
    };

    // Add event listener for visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentView, lastRefreshTime]); // Depend on currentView and lastRefreshTime

  // Auto-refresh profiles when window gains focus
  useEffect(() => {
    const handleWindowFocus = async () => {
      // Only refresh if we're on the dashboard and the window gains focus
      if (currentView === 'dashboard') {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshTime;
        
        // Only refresh if it's been more than 3 seconds since last refresh
        // This prevents excessive API calls when switching windows quickly
        if (timeSinceLastRefresh > 3000) {
          console.log('🔄 Window gained focus - Auto-refreshing profiles...');
          
          try {
            await checkBackendAndLoadProfilesUtility(setProfiles);
            setLastRefreshTime(now);
            console.log('✅ Profiles refreshed after window focus');
          } catch (error) {
            console.error('❌ Error refreshing profiles after window focus:', error);
          }
        }
      }
    };

    // Add event listener for window focus
    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [currentView, lastRefreshTime]); // Depend on currentView and lastRefreshTime

  // Cleanup polling interval on component unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleToggleNumber = async (profileId: number) => {

    try {
      const profile = profiles.find(p => p.id === profileId);
      if (!profile) return;

      // Don't update status immediately - let the backend handle it
      // Just disable the checkbox temporarily
      const updatedProfiles = profiles.map(p => 
        p.id === profileId ? { ...p, isDisabled: true } : p
      );
      setProfiles(updatedProfiles);

      if (profile.isConnected) {
        // Disconnect profile
        const response = await fetch(`/api/whatsapp/profiles/${profileId}/disconnect`, {
          method: 'POST'
        });
        if (response.ok) {
          await loadProfilesUtility(setProfiles); // Reload profiles
        } else {
          // Revert on error
          await loadProfilesUtility(setProfiles);
        }
      } else {
        // Connect profile
        const response = await fetch(`/api/whatsapp/profiles/${profileId}/connect`, {
          method: 'POST'
        });
        if (response.ok) {
          await loadProfilesUtility(setProfiles); // Reload profiles
        } else {
          // Revert on error
          await loadProfilesUtility(setProfiles);
        }
      }
    } catch (error) {
      console.error('Error toggling profile:', error);
      // Revert on error
      await loadProfilesUtility(setProfiles);
    }
  };



  const handleDeleteProfile = async (profileId: number) => {

    try {
      const profile = profiles.find(p => p.id === profileId);
      if (!profile) return;

      // Check if profile is connected
      if (profile.isConnected) {
        showNotification('Cannot delete connected profile. Please disconnect first.', 'error');
        return;
      }

      // Confirm deletion
      const confirmed = window.confirm(`Are you sure you want to delete the profile "${profile.name}"? This action cannot be undone.`);
      
      if (!confirmed) return;

      // Delete profile
      const response = await fetch(`/api/whatsapp/profiles/${profileId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadProfilesUtility(setProfiles); // Reload profiles
        showNotification(`Profile "${profile.name}" deleted successfully`, 'success');
        console.log('Profile deleted successfully');
      } else {
        const errorData = await response.json();
        console.error('Error deleting profile:', errorData);
        showNotification('Error deleting profile. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      showNotification('Error deleting profile. Please try again.', 'error');
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => {
      const maxSlide = Math.max(0, profiles.length - 3);
      return prev >= maxSlide ? prev : prev + 1;
    });
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => {
      return prev <= 0 ? prev : prev - 1;
    });
  };

  const handleAddProfile = async () => {
    if (!profileName.trim()) {
      alert('Please enter a profile name');
      return;
    }

    setIsLoading(true);
    setConnectionStatus('Opening browser window for WhatsApp Web...');
    setModalState('qr');

    try {
      console.log('Connecting to WhatsApp with profile:', profileName);
      
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profileName }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize WhatsApp connection');
      }

      const data = await response.json();
      console.log('WhatsApp connection response:', data);
      
      setClientId(data.clientId);
      
      // Start polling for QR code
      const interval = setInterval(async () => {
        try {
          console.log('Polling QR code for client:', data.clientId);
          
          const qrResponse = await fetch(`/api/whatsapp/qr/${data.clientId}`);
          console.log('QR response status:', qrResponse.status);
          
          if (qrResponse.ok) {
            const qrData = await qrResponse.json();
            console.log('QR data:', qrData);
            
            if (qrData.status === 'qr_ready' && qrData.qrCode) {
              console.log('QR code received');
              setQrCode(qrData.qrCode);
              setConnectionStatus('QR Code generated! Scan it in the browser window or use the code below');
              setIsLoading(false);
            } else if (qrData.status === 'connected') {
              console.log('WhatsApp connected successfully');
              setConnectionStatus('WhatsApp connected successfully!');
              setIsLoading(false);
              clearInterval(interval);
              
              // Show success state
              setModalState('success');
              
              // Reload profiles to show new profile
              await loadProfilesUtility(setProfiles);
              
              // Close modal after 3 seconds
              setTimeout(() => {
                handleCloseModal();
              }, 3000);
            } else if (qrData.status === 'error') {
              console.log('WhatsApp connection error');
              setErrorMessage(qrData.error || 'Connection failed');
              setIsLoading(false);
              clearInterval(interval);
              setModalState('error');
            }
          } else {
            console.log('QR response not ok:', qrResponse.status);
          }
        } catch (error) {
          console.error('Error polling QR code:', error);
          setErrorMessage('Failed to check connection status');
          setIsLoading(false);
          clearInterval(interval);
          setModalState('error');
        }
      }, 2000); // Poll every 2 seconds

      setPollingInterval(interval);
      
    } catch (error) {
      console.error('Error connecting WhatsApp:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
      setModalState('error');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setProfileName('');
    setQrCode('');
    setIsLoading(false);
    setConnectionStatus('');
    setClientId('');
    setModalState('input');
    setErrorMessage('');
    
    // Clear polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  const handleRetry = () => {
    setModalState('input');
    setProfileName('');
    setQrCode('');
    setIsLoading(false);
    setConnectionStatus('');
    setClientId('');
    setErrorMessage('');
    
    // Clear polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  // Notification function
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white max-w-sm transform transition-all duration-300 translate-x-full`;
    
    // Set background color based on type
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    notification.className += ` ${bgColor}`;
    
    notification.innerHTML = `
      <div class="flex items-center">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-2"></i>
        <span>${message}</span>
        <button class="ml-auto text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 300);
    }, 5000);
  };

  // Funções para o sistema de compartilhamento
  const openShareModal = async (profile: WhatsAppProfile) => {
    setSelectedProfile(profile);
    setShowShareModal(true);
    setIsGeneratingLink(true);
    
    try {
      // Verificar status atual do compartilhamento
      const response = await fetch(`/api/whatsapp/profiles/${profile.id}/share`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsSharingEnabled(data.isShared || false);
        setShareLink(data.shareUrl || '');
      } else {
        setIsSharingEnabled(false);
        setShareLink('');
      }
    } catch (error) {
      console.error('Erro ao verificar status do compartilhamento:', error);
      setIsSharingEnabled(false);
      setShareLink('');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleToggleSharing = async () => {
    if (!selectedProfile) return;
    
    setIsGeneratingLink(true);
    
    try {
      if (!isSharingEnabled) {
        // Ativar compartilhamento
        const response = await fetch(`/api/whatsapp/profiles/${selectedProfile.id}/share`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            enabled: true,
            profileName: selectedProfile.name
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          setShareLink(data.shareUrl);
          setIsSharingEnabled(true);
          showNotification('Compartilhamento ativado com sucesso!', 'success');
        } else {
          throw new Error('Falha ao ativar compartilhamento');
        }
      } else {
        // Desativar compartilhamento
        const response = await fetch(`/api/whatsapp/profiles/${selectedProfile.id}/share`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            enabled: false
          })
        });
        
        if (response.ok) {
          setShareLink('');
          setIsSharingEnabled(false);
          showNotification('Compartilhamento desativado!', 'info');
        } else {
          throw new Error('Falha ao desativar compartilhamento');
        }
      }
    } catch (error) {
      console.error('Erro ao gerenciar compartilhamento:', error);
      showNotification('Erro ao gerenciar compartilhamento', 'error');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      showNotification('Link copiado para a área de transferência!', 'success');
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      showNotification('Erro ao copiar link', 'error');
    }
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setSelectedProfile(null);
    setShareLink('');
    setIsSharingEnabled(false);
    setIsGeneratingLink(false);
  };

  const visibleProfiles = profiles.slice(currentSlide, currentSlide + 3);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
              <div className="mb-8">
          <div className="flex items-center justify-between w-full">
            <div>
              <h2 className="text-3xl font-bold text-heading mb-2">Number Management</h2>
              <p className="text-caption">Manage all WhatsApp numbers connected to the system</p>
            </div>
            <button 
              onClick={() => {
                setShowModal(true);
                setModalState('input');
              }}
              className="btn-primary-enhanced flex items-center gap-2"
            >
              <i className="fas fa-plus"></i> Add Profile
            </button>
          </div>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card-enhanced p-6">
          <div className="flex items-center">
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-100 to-green-50 text-green-600 mr-4">
              <i className="fas fa-mobile-alt text-xl"></i>
            </div>
            <div>
              <p className="stats-label">Active Numbers</p>
              <p className="stats-value text-2xl">{profiles.filter(p => p.isConnected).length}</p>
            </div>
          </div>
        </div>
        <div className="card-enhanced p-6">
          <div className="flex items-center">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 mr-4">
              <i className="fas fa-comment-dots text-xl"></i>
            </div>
            <div>
              <p className="stats-label">Total Profiles</p>
              <p className="stats-value text-2xl">{profiles.length}</p>
            </div>
          </div>
        </div>
        <div className="card-enhanced p-6">
          <div className="flex items-center">
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600 mr-4">
              <i className="fas fa-user-plus text-xl"></i>
            </div>
            <div>
              <p className="stats-label">Connected</p>
              <p className="stats-value text-2xl">{profiles.filter(p => p.isConnected).length}</p>
            </div>
          </div>
        </div>
        <div className="card-enhanced p-6">
          <div className="flex items-center">
            <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-50 text-yellow-600 mr-4">
              <i className="fas fa-robot text-xl"></i>
            </div>
            <div>
              <p className="stats-label">Available</p>
              <p className="stats-value text-2xl">{profiles.filter(p => !p.isConnected && p.isActive).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Cards Carousel */}
      <div className="relative">
        {/* Navigation Arrows - Positioned outside the carousel container */}
        <button 
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-20 rounded-full p-4 shadow-2xl transition-all duration-300 carousel-nav-button ${
            currentSlide === 0 
              ? 'bg-gray-300 cursor-not-allowed opacity-50' 
              : 'bg-white hover:bg-green-50 border-2 border-green-500 hover:border-green-600 hover:shadow-green-200'
          }`}
          style={{ left: '-5px' }}
        >
          <i className={`fas fa-chevron-left text-lg ${
            currentSlide === 0 ? 'text-gray-400' : 'text-green-600 hover:text-green-700'
          }`}></i>
        </button>
        
        <button 
          onClick={nextSlide}
          disabled={currentSlide >= Math.max(0, profiles.length - 3)}
          className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-20 rounded-full p-4 shadow-2xl transition-all duration-300 carousel-nav-button ${
            currentSlide >= Math.max(0, profiles.length - 3)
              ? 'bg-gray-300 cursor-not-allowed opacity-50' 
              : 'bg-white hover:bg-green-50 border-2 border-green-500 hover:border-green-600 hover:shadow-green-200'
          }`}
          style={{ right: ' -5px' }}
        >
          <i className={`fas fa-chevron-right text-lg ${
            currentSlide >= Math.max(0, profiles.length - 3) ? 'text-gray-400' : 'text-green-600 hover:text-green-700'
          }`}></i>
        </button>

        {/* Cards Container with proper padding and overflow handling */}
        <div className="carousel-container px-12 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 carousel-slide">
            {visibleProfiles.map((profile) => (
            <div key={profile.id} className="card-enhanced overflow-hidden whatsapp-card" data-number-id={profile.id}>
              <div className="whatsapp-gradient p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <UserProfileAvatar
                    profilePhoto={profile.profilePhoto}
                    name={profile.name}
                    isConnected={profile.isConnected}
                    size="md"
                  />
                  <div className="ml-3">
                    <h3 className="text-white font-medium number-text">{profile.phoneNumber || profile.name}</h3>
                                            <p className="text-xs text-white">
                      {profile.isConnected ? 'Connected' : 
                       profile.status === 'connecting' ? 'Connecting...' : 
                       profile.status}
                    </p>
                  </div>
                </div>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input 
                    type="checkbox" 
                    name={`toggle${profile.id}`} 
                    id={`toggle${profile.id}`} 
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" 
                    checked={profile.isConnected}
                    onChange={() => handleToggleNumber(profile.id)}
                    disabled={profile.status === 'connecting' || profile.isDisabled}
                  />
                  <label htmlFor={`toggle${profile.id}`} className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    profile.status === 'connecting' || profile.isDisabled ? 'bg-gray-400' : 'bg-gray-300'
                  }`}></label>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <i className="fas fa-comment-alt icon-success mr-3"></i>
                    <span className="text-body font-medium">Status</span>
                  </div>
                  <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                    profile.isConnected ? 'bg-green-100 text-green-800' : 
                    profile.status === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                    profile.status === 'error' ? 'bg-red-100 text-red-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {profile.isConnected ? 'Connected' : 
                     profile.status === 'connecting' ? 'Connecting...' : 
                     profile.status}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <i className="fas fa-users icon-info mr-3"></i>
                    <span className="text-body font-medium">Profile</span>
                  </div>
                  <span className="text-body font-medium">{profile.name}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <i className="fas fa-clock icon-warning mr-3"></i>
                    <span className="text-body font-medium">Last Connected</span>
                  </div>
                  <span className="text-body">
                    {profile.lastConnected ? new Date(profile.lastConnected).toLocaleDateString() : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <i className="fas fa-calendar icon-secondary mr-3"></i>
                    <span className="text-body font-medium">Created</span>
                  </div>
                  <span className="text-body">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                <div className="flex justify-between items-center">
                  {/* Ações principais - lado esquerdo */}
                  <div className="flex items-center space-x-2">
                    <button 
                      className={`p-2.5 rounded-full transition-all duration-200 shadow-sm hover:shadow-md ${
                        profile.isConnected 
                          ? 'text-green-600 hover:text-green-700 hover:bg-green-100 cursor-pointer' 
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!profile.isConnected}
                      title={profile.isConnected ? "👁️ Abrir conversas do WhatsApp - Visualize e gerencie todas as mensagens deste perfil" : "⚠️ Perfil desconectado - Conecte o perfil primeiro para visualizar as conversas"}
                      onClick={() => {
                        if (profile.isConnected) {
                          console.log('View button clicked for profile:', profile);
                          setViewParams({ profileId: profile.id.toString(), profileName: profile.name });
                          setSubView('whatsapp-view');
                          console.log('WhatsApp view state updated');
                        }
                      }}
                    >
                      <i className="fas fa-eye text-base"></i>
                    </button>
                    
                    <button 
                      className="p-2.5 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-100 transition-all duration-200 shadow-sm hover:shadow-md"
                      title="⚙️ Configurações do perfil - Ajuste nome, foto, configurações de conexão e preferências"
                    >
                      <i className="fas fa-cog text-base"></i>
                    </button>
                    
                    <button 
                      className="p-2.5 rounded-full text-purple-600 hover:text-purple-700 hover:bg-purple-100 transition-all duration-200 shadow-sm hover:shadow-md"
                      title="🔗 Compartilhar link de acesso do perfil - Crie um link público para acessar este perfil do WhatsApp"
                      onClick={() => openShareModal(profile)}
                    >
                      <i className="fas fa-share-alt text-base"></i>
                    </button>
                  </div>
                  
                  {/* Ações secundárias - lado direito */}
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleToggleNumber(profile.id)}
                      className={`p-2.5 rounded-full transition-all duration-200 shadow-sm hover:shadow-md ${
                        profile.isConnected 
                          ? 'text-red-600 hover:text-red-700 hover:bg-red-100' 
                          : 'text-green-600 hover:text-green-700 hover:bg-green-100'
                      }`}
                      disabled={profile.status === 'connecting' || profile.isDisabled}
                      title={profile.isConnected ? '🔌 Desconectar perfil - Encerre a conexão WhatsApp deste perfil' : '🔌 Conectar perfil - Inicie a conexão WhatsApp para este perfil'}
                    >
                      <i className={`fas ${profile.isConnected ? 'fa-power-off' : 'fa-play'} text-base`}></i>
                    </button>
                    
                    <button 
                      onClick={() => handleDeleteProfile(profile.id)}
                      className={`p-2.5 rounded-full transition-all duration-200 shadow-sm hover:shadow-md ${
                        !profile.isConnected 
                          ? 'text-red-600 hover:text-red-700 hover:bg-red-100 cursor-pointer' 
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={profile.isConnected}
                      title={!profile.isConnected ? "🗑️ Excluir perfil permanentemente - Esta ação não pode ser desfeita" : "⚠️ Perfil conectado - Desconecte o perfil primeiro para poder excluí-lo"}
                    >
                      <i className="fas fa-trash-alt text-base"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        </div>

        {/* Carousel Indicators */}
        <div className="flex justify-center mt-8 space-x-3">
          {Array.from({ length: Math.ceil(profiles.length / 3) }, (_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index * 3)}
              className={`w-4 h-4 rounded-full transition-all duration-300 carousel-indicator shadow-md ${
                currentSlide >= index * 3 && currentSlide < (index + 1) * 3
                  ? 'bg-green-500 scale-125 shadow-green-300'
                  : 'bg-gray-300 hover:bg-gray-400 hover:scale-110'
              }`}
            />
          ))}
        </div>

        {/* Carousel Info */}
        <div className="text-center mt-4">
          <p className="text-caption">
            Showing {currentSlide + 1}-{Math.min(currentSlide + 3, profiles.length)} of {profiles.length} profiles
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-2xl font-bold text-heading">Recent Activity</h2>
          <div>
            <label htmlFor="filter" className="sr-only">Filter by</label>
            <div className="relative">
              <select id="filter" className="block appearance-none w-48 bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500">
                <option value="all">All profiles</option>
                {profiles.map(profile => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <i className="fas fa-chevron-down"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="card-enhanced overflow-hidden">
          <div className="divide-y divide-gray-200">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="p-6 hover:bg-gray-50 transition duration-150 activity-item" data-number={activity.number}>
                <div className="flex items-start">
                  <div className="flex-shrink-0 relative">
                    <img className="w-10 h-10 rounded-full border-2 border-white" src={activity.avatar} alt="Profile" />
                    <div className={`absolute -bottom-1 -right-1 bg-${activity.color}-100 rounded-full p-1 text-${activity.color}-600 text-xs`}>
                      <i className={activity.icon}></i>
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-body font-medium">{activity.title}</p>
                      <p className="text-caption">{activity.time}</p>
                    </div>
                    <p className="text-body">{activity.description}</p>
                    <p className="text-caption mt-2 italic">"{activity.content}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Profile Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 modal-backdrop flex items-center justify-center z-50">
          <div className="card-enhanced shadow-2xl max-w-md w-full mx-4 overflow-hidden modal-content">
            {/* Modal Header */}
            <div className="whatsapp-gradient p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Add WhatsApp Profile</h3>
                <button 
                  onClick={handleCloseModal}
                  className="text-white hover:text-gray-200 transition duration-200"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {modalState === 'input' && (
                <>
                  <div className="mb-4">
                                    <label htmlFor="profileName" className="block text-body font-medium mb-3">
                  Profile Name
                </label>
                    <input
                      type="text"
                      id="profileName"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Enter profile name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddProfile}
                      disabled={!profileName.trim()}
                      className={`px-6 py-2 rounded-md text-white font-medium transition duration-200 ${
                        profileName.trim() 
                          ? 'whatsapp-gradient hover:bg-green-600' 
                          : 'bg-gray-300 cursor-not-allowed'
                      }`}
                    >
                      Connect WhatsApp
                    </button>
                  </div>
                </>
              )}

              {modalState === 'qr' && (
                <>
                  {/* QR Code Display Area */}
                  <div className="mb-6">
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 min-h-[200px] flex items-center justify-center qr-container">
                      {isLoading ? (
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                          <p className="text-body">{connectionStatus}</p>
                        </div>
                      ) : qrCode ? (
                        <div className="text-center">
                          <p className="text-body mb-4">{connectionStatus}</p>
                          <img 
                            src={qrCode} 
                            alt="WhatsApp QR Code" 
                            className="mx-auto max-w-full h-auto max-h-[180px]"
                          />
                          <div className="text-caption mt-4 space-y-1">
                            <p>1. A browser window with WhatsApp Web will open</p>
                            <p>2. Scan the QR code in the browser window</p>
                            <p>3. Or scan the QR code below with your phone</p>
                            <p>4. Wait for the connection to complete</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-muted">
                          <i className="fas fa-qrcode text-4xl mb-3"></i>
                          <p className="text-body">QR Code will appear here after connecting</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200"
                    >
                      Cancel
                    </button>
                    {qrCode && (
                      <button
                        onClick={() => {
                          setQrCode('');
                          setConnectionStatus('Reconnecting...');
                          setIsLoading(true);
                          handleAddProfile();
                        }}
                        className="px-6 py-2 whatsapp-gradient text-white rounded-md font-medium hover:bg-green-600 transition duration-200"
                      >
                        Refresh QR Code
                      </button>
                    )}
                  </div>
                </>
              )}

              {modalState === 'success' && (
                <>
                  <div className="mb-6">
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 min-h-[200px] flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <i className="fas fa-check text-2xl text-green-600"></i>
                        </div>
                        <h3 className="text-lg font-semibold text-green-800 mb-2">Profile Added Successfully!</h3>
                        <p className="text-sm text-green-600">{connectionStatus}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                                          <button
                        onClick={handleCloseModal}
                        className="px-6 py-2 whatsapp-gradient text-white rounded-md font-medium hover:bg-green-600 transition duration-200"
                      >
                        Close
                      </button>
                  </div>
                </>
              )}

              {modalState === 'error' && (
                <>
                  <div className="mb-6">
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 min-h-[200px] flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <i className="fas fa-exclamation-triangle text-2xl text-red-600"></i>
                        </div>
                        <h3 className="text-lg font-semibold text-red-800 mb-2">Connection Error</h3>
                        <p className="text-sm text-red-600 mb-4">{errorMessage}</p>
                        <p className="text-xs text-red-500">WhatsApp Puppeteer will be closed automatically.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={handleRetry}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition duration-200"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Compartilhamento */}
      {showShareModal && selectedProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Compartilhar Link de Acesso
                </h3>
                <button
                  onClick={closeShareModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedProfile.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{selectedProfile.name}</h4>
                    <p className="text-sm text-gray-500">
                      {selectedProfile.isConnected ? 'Conectado' : 'Desconectado'}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-3">
                    Crie um link público para acessar este perfil do WhatsApp em uma página dedicada.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Status do Compartilhamento:
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isSharingEnabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <i className={`fas ${isSharingEnabled ? 'fa-check-circle' : 'fa-times-circle'} mr-1`}></i>
                        {isSharingEnabled ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Ativar/Desativar:
                      </span>
                      <button
                        onClick={handleToggleSharing}
                        disabled={isGeneratingLink}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                          isSharingEnabled ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isSharingEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {isSharingEnabled && shareLink && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Link de Acesso:
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={shareLink}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                        />
                        <button
                          onClick={copyToClipboard}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <i className="fas fa-copy"></i>
                        </button>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                        <div className="text-sm text-blue-700">
                          <p className="font-medium mb-1">Como usar:</p>
                          <ul className="space-y-1 text-xs">
                            <li>• Compartilhe este link com quem precisa acessar o WhatsApp</li>
                            <li>• O link abre uma página dedicada sem layout externo</li>
                            <li>• Acesso direto às conversas deste perfil</li>
                            <li>• Funciona em qualquer dispositivo</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isGeneratingLink && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mr-3"></div>
                    <span className="text-sm text-gray-600">
                      {isSharingEnabled ? 'Desativando...' : 'Gerando link...'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeShareModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Fechar
                </button>
                {isSharingEnabled && shareLink && (
                  <a
                    href={shareLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <i className="fas fa-external-link-alt mr-2"></i>
                    Abrir Link
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 