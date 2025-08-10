'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../../contexts/AppContext';
import { usePreservedState } from '../../../shared/hooks/usePreservedState';
import ContactAvatar from '../../../shared/components/ContactAvatar';
import './contacts.css';

interface Contact {
  id: string;
  name: string;
  number: string;
  email?: string;
  avatar?: string;
  isOnline: boolean;
  status: 'active' | 'inactive' | 'blocked';
  tags: string[];
  groups: string[];
  lastMessage?: string;
  lastActivity?: Date;
  totalMessages: number;
  assignedTo?: string;
  notes?: string;
  createdAt: Date;
}

const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'João Silva',
    number: '(11) 98765-4321',
    email: 'joao.silva@email.com',
    isOnline: true,
    status: 'active',
    tags: ['client', 'vip', 'sale'],
    groups: ['VIP Clients', 'Sales'],
    lastMessage: 'Hello! I would like to know more about your products...',
    lastActivity: new Date(Date.now() - 2 * 60 * 1000),
    totalMessages: 45,
    assignedTo: 'Ana Sales',
    notes: 'Client interested in premium products',
    createdAt: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'Maria Santos',
    number: '(21) 99876-5432',
    email: 'maria.santos@email.com',
    isOnline: false,
    status: 'active',
    tags: ['client', 'satisfied'],
    groups: ['Clients', 'Support'],
    lastMessage: 'Thank you for the service!',
    lastActivity: new Date(Date.now() - 15 * 60 * 1000),
    totalMessages: 23,
    assignedTo: 'Carlos Support',
    notes: 'Client satisfied with the product',
    createdAt: new Date('2024-02-10')
  },
  {
    id: '3',
    name: 'Pedro Costa',
    number: '(31) 98765-1234',
    email: 'pedro.costa@email.com',
    isOnline: true,
    status: 'active',
    tags: ['support', 'urgent'],
    groups: ['Technical Support'],
    lastMessage: 'I need urgent technical support',
    lastActivity: new Date(Date.now() - 30 * 60 * 1000),
    totalMessages: 12,
    assignedTo: 'Tech Support',
    notes: 'Pending technical issue',
    createdAt: new Date('2024-03-05')
  },
  {
    id: '4',
    name: 'Ana Oliveira',
    number: '(41) 91234-5678',
    email: 'ana.oliveira@email.com',
    isOnline: false,
    status: 'active',
    tags: ['order', 'delivery'],
    groups: ['Sales', 'Logistics'],
    lastMessage: 'When will my order arrive?',
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
    totalMessages: 8,
    assignedTo: 'Logistics Team',
    notes: 'Waiting for delivery confirmation',
    createdAt: new Date('2024-03-20')
  },
  {
    id: '5',
    name: 'Carlos Ferreira',
    number: '(51) 94567-8901',
    email: 'carlos.ferreira@email.com',
    isOnline: true,
    status: 'blocked',
    tags: ['spam', 'blocked'],
    groups: ['Blocked'],
    lastMessage: 'Unmissable promotion!!!',
    lastActivity: new Date(Date.now() - 1 * 60 * 60 * 1000),
    totalMessages: 3,
    assignedTo: 'Spam Filter',
    notes: 'Contact blocked for spam',
    createdAt: new Date('2024-03-25')
  }
];

export default function ContactsPage() {
  const { setCurrentView, currentView, goToView } = useApp();
  const router = useRouter();
  
  // States with automatic preservation
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'blocked'>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastActivity' | 'totalMessages' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  
  // States for profile selection modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Key for state preservation
  const viewKey = 'contacts-none';

  // Use hook to preserve state
  const preservedState = usePreservedState({
    searchTerm,
    filterStatus,
    filterGroup,
    sortBy,
    sortOrder,
    viewMode,
    selectedContacts,
    showSettings
  }, {
    maxSize: 10,
    persistToStorage: true,
    storageKey: `contacts-${viewKey}`
  });

  useEffect(() => {
    // Avoid infinite loop - only set view if not already set
    if (currentView !== 'contacts') {
      setCurrentView('contacts');
    }
  }, []); // Remove setCurrentView from dependencies

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.number.includes(searchTerm) ||
                         contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || contact.status === filterStatus;
    const matchesGroup = filterGroup === 'all' || contact.groups.includes(filterGroup);
    
    return matchesSearch && matchesStatus && matchesGroup;
  });

  const sortedContacts = [...filteredContacts].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'lastActivity':
        comparison = (a.lastActivity?.getTime() || 0) - (b.lastActivity?.getTime() || 0);
        break;
      case 'totalMessages':
        comparison = a.totalMessages - b.totalMessages;
        break;
      case 'createdAt':
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'blocked': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAllGroups = () => {
    const groups = new Set<string>();
    contacts.forEach(contact => {
      contact.groups.forEach(group => groups.add(group));
    });
    return Array.from(groups);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const selectAllContacts = () => {
    setSelectedContacts(filteredContacts.map(contact => contact.id));
  };

  const clearSelection = () => {
    setSelectedContacts([]);
  };

  // Function to load WhatsApp profiles
  const loadProfiles = async () => {
    try {
      setLoadingProfiles(true);
      const { whatsappSync } = await import('../../../shared/services/whatsappSync');
      const profilesData = await whatsappSync.getProfiles();
      setProfiles(profilesData);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoadingProfiles(false);
    }
  };

  // Function to open profile selection modal
  const openProfileModal = async (contact: Contact) => {
    setSelectedContact(contact);
    setShowProfileModal(true);
    await loadProfiles();
  };

  // Function to close modal
  const closeProfileModal = () => {
    setShowProfileModal(false);
    setSelectedContact(null);
    setSelectedProfile('');
  };

  // Function to continue and open WhatsApp view in child content
  const continueToWhatsApp = () => {
    if (!selectedContact || !selectedProfile) return;
    
    // Find selected profile to get name
    const selectedProfileData = profiles.find(p => p.id.toString() === selectedProfile);
    const profileName = selectedProfileData?.name || 'WhatsApp Profile';
    
    // Use new navigation system
    goToView('dashboard', 'whatsapp-view', {
      profileId: selectedProfile,
      profileName: profileName,
      contactNumber: selectedContact.number
    });
    
    // Close modal
    closeProfileModal();
    
    console.log('✅ WhatsApp view opened using intelligent navigation:', {
      profileId: selectedProfile,
      profileName: profileName,
      contactNumber: selectedContact.number
    });
  };

  return (
    <div className="min-h-screen contacts-bg contacts-page">
      {/* Header Section - Compact and Professional */}
      <div className="contacts-header sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Left side - Title and stats */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <i className="fas fa-users text-green-600 mr-2 text-lg"></i>
                <h1 className="text-xl font-semibold text-gray-900">Contacts</h1>
              </div>
              <div className="hidden sm:flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <i className="fas fa-circle text-green-500 mr-1 text-xs"></i>
                  {contacts.filter(c => c.status === 'active').length} Active
                </span>
                <span className="flex items-center">
                  <i className="fas fa-circle text-gray-400 mr-1 text-xs"></i>
                  {contacts.filter(c => c.status === 'inactive').length} Inactive
                </span>
                <span className="flex items-center">
                  <i className="fas fa-circle text-red-500 mr-1 text-xs"></i>
                  {contacts.filter(c => c.status === 'blocked').length} Blocked
                </span>
              </div>
            </div>
            
            {/* Right side - Actions */}
            <div className="flex items-center space-x-3">
              {/* View mode toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-all duration-200 ${
                    viewMode === 'grid' 
                      ? 'bg-white text-green-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Grid view"
                >
                  <i className="fas fa-th-large text-sm"></i>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-all duration-200 ${
                    viewMode === 'list' 
                      ? 'bg-white text-green-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="List view"
                >
                  <i className="fas fa-list text-sm"></i>
                </button>
              </div>
              
              {/* Settings button */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                title="Settings"
              >
                <i className="fas fa-cog"></i>
              </button>
              
              {/* New contact button */}
              <button className="btn-primary-enhanced inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200">
                <i className="fas fa-plus mr-1.5"></i>
                New Contact
              </button>
            </div>
          </div>
          
          {/* Search bar integrated in header */}
          <div className="mt-3">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400 text-sm"></i>
              </div>
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Settings Sidebar */}
        {showSettings && (
          <div className="w-80 settings-sidebar min-h-screen p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <i className="fas fa-cog text-green-600 mr-2"></i>
                Settings
              </h3>
            </div>

            {/* Search Configuration */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Search and Filters</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm bg-white text-gray-900"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Group</label>
                  <select
                    value={filterGroup}
                    onChange={(e) => setFilterGroup(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm bg-white text-gray-900"
                  >
                    <option value="all">All Groups</option>
                    {getAllGroups().length === 0 ? (
                      <option value="none" disabled>No groups found</option>
                    ) : (
                      getAllGroups().map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Sorting Configuration */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Sorting</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sort by</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm bg-white text-gray-900"
                  >
                    <option value="name">Name</option>
                    <option value="lastActivity">Last Activity</option>
                    <option value="totalMessages">Total Messages</option>
                    <option value="createdAt">Creation Date</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Order</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm bg-white text-gray-900"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <button className="quick-action w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                  <i className="fas fa-download mr-2 text-green-600"></i>
                  Export Contacts
                </button>
                <button className="quick-action w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                  <i className="fas fa-upload mr-2 text-blue-600"></i>
                  Import Contacts
                </button>
                <button className="quick-action w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                  <i className="fas fa-tags mr-2 text-purple-600"></i>
                  Manage Tags
                </button>
                <button className="quick-action w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                  <i className="fas fa-users mr-2 text-indigo-600"></i>
                  Manage Groups
                </button>
              </div>
            </div>

            {/* Statistics */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Statistics</h4>
              <div className="space-y-3">
                <div className="stat-card total flex justify-between items-center p-3 rounded-lg">
                  <span className="text-sm text-gray-600">Total Contacts</span>
                  <span className="text-sm font-semibold text-gray-900">{contacts.length}</span>
                </div>
                <div className="stat-card active flex justify-between items-center p-3 rounded-lg">
                  <span className="text-sm text-gray-600">Active</span>
                  <span className="text-sm font-semibold text-green-700">
                    {contacts.filter(c => c.status === 'active').length}
                  </span>
                </div>
                <div className="stat-card blocked flex justify-between items-center p-3 rounded-lg">
                  <span className="text-sm text-gray-600">Blocked</span>
                  <span className="text-sm font-semibold text-red-700">
                    {contacts.filter(c => c.status === 'blocked').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className={`flex-1 transition-all duration-300 ${showSettings ? 'ml-0' : ''}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Results info */}
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {filteredContacts.length} of {contacts.length} contacts
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border-0 bg-transparent text-gray-700 font-medium focus:outline-none focus:ring-0"
                >
                  <option value="name">Name</option>
                  <option value="lastActivity">Last Activity</option>
                  <option value="totalMessages">Messages</option>
                  <option value="createdAt">Created</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'} text-xs`}></i>
                </button>
              </div>
            </div>

            {/* Selection Actions - Compact */}
            {selectedContacts.length > 0 && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <i className="fas fa-check-circle text-blue-600 mr-2"></i>
                    <span className="text-sm font-medium text-blue-800">
                      {selectedContacts.length} selected
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors">
                      <i className="fas fa-tag mr-1"></i>
                      Tag
                    </button>
                    <button className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors">
                      <i className="fas fa-users mr-1"></i>
                      Group
                    </button>
                    <button className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors">
                      <i className="fas fa-envelope mr-1"></i>
                      Message
                    </button>
                    <button 
                      onClick={clearSelection}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                    >
                      <i className="fas fa-times mr-1"></i>
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Contacts Grid/List */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`contact-card rounded-lg shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-md cursor-pointer group bg-white ${
                      selectedContacts.includes(contact.id) 
                        ? 'ring-2 ring-blue-500 border-blue-500' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => toggleContactSelection(contact.id)}
                  >
                    <div className="p-4">
                      {/* Header - Compact */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <ContactAvatar 
                            contactId={contact.id}
                            profileId="1"
                            name={contact.name}
                            avatar={contact.avatar}
                            isGroup={false}
                            size="md" 
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 truncate">
                              {contact.name}
                            </h3>
                            <p className="text-sm text-gray-500 truncate">{contact.number}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                          {contact.isOnline && (
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contact.status)}`}>
                            {contact.status === 'active' ? 'Active' : contact.status === 'inactive' ? 'Inactive' : 'Blocked'}
                          </span>
                        </div>
                      </div>

                      {/* Contact Info - Compact */}
                      <div className="space-y-2 mb-3">
                        {contact.email && (
                          <div className="flex items-center text-xs text-gray-600">
                            <i className="fas fa-envelope w-3 mr-1.5 text-gray-400"></i>
                            <span className="truncate">{contact.email}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <div className="flex items-center">
                            <i className="fas fa-comment w-3 mr-1.5 text-gray-400"></i>
                            <span>{contact.totalMessages} messages</span>
                          </div>
                          {contact.lastActivity && (
                            <div className="flex items-center">
                              <i className="fas fa-clock w-3 mr-1.5 text-gray-400"></i>
                              <span>{formatTimeAgo(contact.lastActivity)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tags and Groups - Compact */}
                      {(contact.tags.length > 0 || contact.groups.length > 0) && (
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-1">
                            {contact.tags.slice(0, 2).map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700"
                              >
                                {tag}
                              </span>
                            ))}
                            {contact.groups.slice(0, 1).map((group, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700"
                              >
                                {group}
                              </span>
                            ))}
                            {(contact.tags.length > 2 || contact.groups.length > 1) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                +{(contact.tags.length - 2) + (contact.groups.length - 1)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions - Compact */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex items-center space-x-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openProfileModal(contact);
                            }}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors duration-200"
                            title="Send message"
                          >
                            <i className="fas fa-comment text-sm"></i>
                          </button>
                          <button 
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
                            title="Edit contact"
                          >
                            <i className="fas fa-edit text-sm"></i>
                          </button>
                          <button 
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
                            title="Delete contact"
                          >
                            <i className="fas fa-trash text-sm"></i>
                          </button>
                        </div>
                        {contact.assignedTo && (
                          <span className="text-xs text-gray-500 truncate max-w-20">
                            {contact.assignedTo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="table-enhanced rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                            onChange={selectAllContacts}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tags
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Activity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Messages
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedContacts.map((contact) => (
                        <tr
                          key={contact.id}
                          className={`hover:bg-gray-50 transition-colors duration-200 ${
                            selectedContacts.includes(contact.id) ? 'bg-green-50' : ''
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedContacts.includes(contact.id)}
                              onChange={() => toggleContactSelection(contact.id)}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <ContactAvatar 
                               contactId={contact.id}
                               profileId="1"
                               name={contact.name}
                               avatar={contact.avatar}
                               isGroup={false}
                               size="sm" 
                             />
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                                <div className="text-sm text-gray-500">{contact.number}</div>
                                {contact.email && (
                                  <div className="text-sm text-gray-500">{contact.email}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {contact.isOnline && (
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                              )}
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contact.status)}`}>
                                {contact.status === 'active' ? 'Active' : contact.status === 'inactive' ? 'Inactive' : 'Blocked'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {contact.tags.slice(0, 2).map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {tag}
                                </span>
                              ))}
                              {contact.tags.length > 2 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                                  +{contact.tags.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {contact.lastActivity ? formatTimeAgo(contact.lastActivity) : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {contact.totalMessages}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => openProfileModal(contact)}
                                className="text-green-600 hover:text-green-900"
                                title="Send message"
                              >
                                <i className="fas fa-comment"></i>
                              </button>
                              <button className="text-blue-600 hover:text-blue-900">
                                <i className="fas fa-edit"></i>
                              </button>
                              <button className="text-red-600 hover:text-red-900">
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {sortedContacts.length === 0 && (
              <div className="empty-state text-center py-12">
                <div className="empty-state-icon mx-auto h-24 w-24 text-gray-400">
                  <i className="fas fa-users text-6xl"></i>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || filterStatus !== 'all' || filterGroup !== 'all' 
                    ? 'Try adjusting the search filters.' 
                    : 'Start by adding your first contact.'}
                </p>
                <div className="mt-6">
                  <button className="btn-primary-enhanced inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                    <i className="fas fa-plus mr-2"></i>
                    Add Contact
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Selection Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <i className="fas fa-whatsapp text-green-600 mr-3"></i>
                Select WhatsApp Profile
              </h3>
              <button
                onClick={closeProfileModal}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Contact Information */}
            {selectedContact && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <ContactAvatar 
                    contactId={selectedContact.id}
                    profileId="1"
                    name={selectedContact.name}
                    avatar={selectedContact.avatar}
                    isGroup={false}
                    size="md" 
                  />
                  <div className="ml-3">
                    <h4 className="font-medium text-gray-900">{selectedContact.name}</h4>
                    <p className="text-sm text-gray-600">{selectedContact.number}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Choose the WhatsApp profile to send the message:
              </label>
              
              {loadingProfiles ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <span className="ml-3 text-gray-600">Loading profiles...</span>
                </div>
              ) : profiles.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-exclamation-triangle text-yellow-500 text-3xl mb-3"></i>
                  <p className="text-gray-600">No WhatsApp profiles found</p>
                  <p className="text-sm text-gray-500 mt-1">Configure a WhatsApp profile first</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedProfile === profile.id.toString()
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                      }`}
                      onClick={() => setSelectedProfile(profile.id.toString())}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 ${
                            profile.isConnected ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <div>
                            <h4 className="font-medium text-gray-900">{profile.name}</h4>
                            <p className="text-sm text-gray-600">
                              {profile.isConnected ? 'Connected' : 'Disconnected'}
                            </p>
                          </div>
                        </div>
                        {selectedProfile === profile.id.toString() && (
                          <i className="fas fa-check text-green-600 text-xl"></i>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={closeProfileModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={continueToWhatsApp}
                disabled={!selectedProfile || loadingProfiles}
                className={`px-6 py-2 rounded-lg transition-all duration-200 ${
                  selectedProfile && !loadingProfiles
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <i className="fas fa-arrow-right mr-2"></i>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 