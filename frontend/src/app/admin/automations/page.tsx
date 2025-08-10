'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../../../contexts/AppContext';

interface Automation {
  id: string;
  name: string;
  description: string;
  type: 'welcome' | 'follow-up' | 'reminder' | 'campaign' | 'support' | 'custom';
  status: 'active' | 'inactive' | 'draft' | 'paused';
  trigger: 'message' | 'time' | 'event' | 'manual';
  conditions: string[];
  actions: string[];
  targetAudience: string[];
  schedule?: {
    startDate: Date;
    endDate?: Date;
    timezone: string;
    frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  };
  stats: {
    totalSent: number;
    delivered: number;
    read: number;
    replied: number;
    conversionRate: number;
  };
  createdAt: Date;
  lastModified: Date;
  createdBy: string;
}

const mockAutomations: Automation[] = [
  {
    id: '1',
    name: 'Welcome Message',
    description: 'Automated welcome message for new contacts',
    type: 'welcome',
    status: 'active',
    trigger: 'message',
    conditions: ['New contact', 'First message'],
    actions: ['Send welcome message', 'Add to welcome list'],
    targetAudience: ['All new contacts'],
    stats: {
      totalSent: 1247,
      delivered: 1189,
      read: 892,
      replied: 234,
      conversionRate: 19.7
    },
    createdAt: new Date('2024-01-15'),
    lastModified: new Date('2024-03-20'),
    createdBy: 'Ana Sales'
  },
  {
    id: '2',
    name: 'Follow-up Campaign',
    description: 'Follow-up messages for interested prospects',
    type: 'follow-up',
    status: 'active',
    trigger: 'time',
    conditions: ['Contact showed interest', 'No response in 24h'],
    actions: ['Send follow-up message', 'Schedule reminder'],
    targetAudience: ['Prospects', 'Interested contacts'],
    schedule: {
      startDate: new Date('2024-03-01'),
      timezone: 'America/Sao_Paulo',
      frequency: 'daily'
    },
    stats: {
      totalSent: 856,
      delivered: 823,
      read: 567,
      replied: 145,
      conversionRate: 17.6
    },
    createdAt: new Date('2024-02-10'),
    lastModified: new Date('2024-03-25'),
    createdBy: 'Carlos Marketing'
  },
  {
    id: '3',
    name: 'Order Reminder',
    description: 'Remind customers about pending orders',
    type: 'reminder',
    status: 'active',
    trigger: 'event',
    conditions: ['Order placed', 'Payment pending'],
    actions: ['Send payment reminder', 'Update order status'],
    targetAudience: ['Customers with pending orders'],
    stats: {
      totalSent: 342,
      delivered: 328,
      read: 289,
      replied: 89,
      conversionRate: 26.0
    },
    createdAt: new Date('2024-03-05'),
    lastModified: new Date('2024-03-28'),
    createdBy: 'Logistics Team'
  },
  {
    id: '4',
    name: 'Support Ticket Follow-up',
    description: 'Follow up on support tickets',
    type: 'support',
    status: 'paused',
    trigger: 'time',
    conditions: ['Support ticket created', 'No response in 2h'],
    actions: ['Send follow-up message', 'Escalate to supervisor'],
    targetAudience: ['Support tickets'],
    schedule: {
      startDate: new Date('2024-03-15'),
      timezone: 'America/Sao_Paulo',
      frequency: 'daily'
    },
    stats: {
      totalSent: 156,
      delivered: 142,
      read: 98,
      replied: 45,
      conversionRate: 28.8
    },
    createdAt: new Date('2024-03-10'),
    lastModified: new Date('2024-03-22'),
    createdBy: 'Tech Support'
  },
  {
    id: '5',
    name: 'Holiday Campaign',
    description: 'Special holiday promotion campaign',
    type: 'campaign',
    status: 'draft',
    trigger: 'manual',
    conditions: ['Holiday season', 'Customer segment'],
    actions: ['Send promotional message', 'Apply discount code'],
    targetAudience: ['VIP customers', 'Regular customers'],
    stats: {
      totalSent: 0,
      delivered: 0,
      read: 0,
      replied: 0,
      conversionRate: 0
    },
    createdAt: new Date('2024-04-01'),
    lastModified: new Date('2024-04-01'),
    createdBy: 'Marketing Team'
  }
];

export default function AutomationsPage() {
  const { setCurrentView, currentView } = useApp();
  const [automations, setAutomations] = useState<Automation[]>(mockAutomations);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'welcome' | 'follow-up' | 'reminder' | 'campaign' | 'support' | 'custom'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'draft' | 'paused'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'stats' | 'status'>('name');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    // Evitar loop infinito - só definir a view se não estiver já definida
    if (currentView !== 'automations') {
      setCurrentView('automations');
    }
  }, []); // Remover setCurrentView das dependências

  const filteredAutomations = automations.filter(automation => {
    const matchesSearch = automation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         automation.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || automation.type === filterType;
    const matchesStatus = filterStatus === 'all' || automation.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const sortedAutomations = [...filteredAutomations].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'createdAt':
        return b.createdAt.getTime() - a.createdAt.getTime();
      case 'stats':
        return b.stats.conversionRate - a.stats.conversionRate;
      case 'status':
        const statusOrder = { active: 4, paused: 3, inactive: 2, draft: 1 };
        return statusOrder[b.status] - statusOrder[a.status];
      default:
        return 0;
    }
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'welcome': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'follow-up': return 'bg-green-100 text-green-800 border-green-200';
      case 'reminder': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'campaign': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'support': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'custom': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'paused': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'welcome': return 'fas fa-hand-wave';
      case 'follow-up': return 'fas fa-reply';
      case 'reminder': return 'fas fa-bell';
      case 'campaign': return 'fas fa-bullhorn';
      case 'support': return 'fas fa-headset';
      case 'custom': return 'fas fa-cog';
      default: return 'fas fa-robot';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const toggleAutomationStatus = (automationId: string) => {
    setAutomations(prev => prev.map(automation => {
      if (automation.id === automationId) {
        const newStatus = automation.status === 'active' ? 'paused' : 'active';
        return { ...automation, status: newStatus };
      }
      return automation;
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
              <p className="text-gray-600 mt-1">Create and manage automated messaging workflows</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <i className="fas fa-plus text-sm"></i>
                <span>Create Automation</span>
              </button>
              <button className="btn-secondary flex items-center space-x-2">
                <i className="fas fa-download text-sm"></i>
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Search automations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-enhanced pl-10 w-full"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="input-enhanced"
              >
                <option value="all">All Types</option>
                <option value="welcome">Welcome</option>
                <option value="follow-up">Follow-up</option>
                <option value="reminder">Reminder</option>
                <option value="campaign">Campaign</option>
                <option value="support">Support</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="input-enhanced"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>

          {/* Additional Controls */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="input-enhanced text-sm"
              >
                <option value="name">Sort by: Name</option>
                <option value="createdAt">Sort by: Created Date</option>
                <option value="stats">Sort by: Performance</option>
                <option value="status">Sort by: Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 card-enhanced">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Automations</p>
                <p className="text-2xl font-bold text-gray-900">{automations.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-robot text-blue-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 card-enhanced">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Automations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {automations.filter(a => a.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-play text-green-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 card-enhanced">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Messages Sent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {automations.reduce((sum, automation) => sum + automation.stats.totalSent, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-paper-plane text-purple-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 card-enhanced">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(automations.reduce((sum, automation) => sum + automation.stats.conversionRate, 0) / automations.length).toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-chart-line text-orange-600 text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Automations List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">All Automations</h2>
            <p className="text-sm text-gray-600 mt-1">
              Showing {sortedAutomations.length} of {automations.length} automations
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {sortedAutomations.map((automation) => (
              <div
                key={automation.id}
                className={`p-6 hover:bg-gray-50 transition-all duration-200 cursor-pointer ${
                  selectedAutomation?.id === automation.id ? 'bg-green-50 border-l-4 border-green-500' : ''
                }`}
                onClick={() => setSelectedAutomation(automation)}
              >
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getTypeColor(automation.type).replace('border-', 'bg-').replace('text-', 'text-').replace('bg-blue-100', 'bg-blue-100').replace('bg-green-100', 'bg-green-100').replace('bg-yellow-100', 'bg-yellow-100').replace('bg-purple-100', 'bg-purple-100').replace('bg-orange-100', 'bg-orange-100').replace('bg-gray-100', 'bg-gray-100')}`}>
                      <i className={`${getTypeIcon(automation.type)} text-lg`}></i>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {automation.name}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(automation.type)}`}>
                          {automation.type}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(automation.status)}`}>
                          {automation.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAutomationStatus(automation.id);
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            automation.status === 'active' 
                              ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <i className={`fas ${automation.status === 'active' ? 'fa-pause' : 'fa-play'}`}></i>
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <i className="fas fa-ellipsis-v"></i>
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {automation.description}
                    </p>

                    {/* Trigger and Actions */}
                    <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                      <span>Trigger: {automation.trigger}</span>
                      <span>Created: {formatDate(automation.createdAt)}</span>
                      <span>By: {automation.createdBy}</span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Sent</p>
                        <p className="text-sm font-semibold text-gray-900">{automation.stats.totalSent.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Delivered</p>
                        <p className="text-sm font-semibold text-gray-900">{automation.stats.delivered.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Read</p>
                        <p className="text-sm font-semibold text-gray-900">{automation.stats.read.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Conversion</p>
                        <p className="text-sm font-semibold text-gray-900">{automation.stats.conversionRate}%</p>
                      </div>
                    </div>

                    {/* Conditions and Actions */}
                    <div className="flex items-center space-x-2 mt-3">
                      <span className="text-xs text-gray-500">Conditions:</span>
                      {automation.conditions.map((condition, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200"
                        >
                          {condition}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {sortedAutomations.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-robot text-gray-400 text-2xl"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No automations found</h3>
              <p className="text-gray-600">Try adjusting your search or filters to find what you're looking for.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Automation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New Automation</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Automation Name</label>
                <input
                  type="text"
                  className="input-enhanced w-full"
                  placeholder="Enter automation name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="input-enhanced w-full"
                  rows={3}
                  placeholder="Describe what this automation does"
                ></textarea>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select className="input-enhanced w-full">
                    <option value="welcome">Welcome</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="reminder">Reminder</option>
                    <option value="campaign">Campaign</option>
                    <option value="support">Support</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
                  <select className="input-enhanced w-full">
                    <option value="message">Message</option>
                    <option value="time">Time</option>
                    <option value="event">Event</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                <input
                  type="text"
                  className="input-enhanced w-full"
                  placeholder="e.g., All contacts, VIP customers, etc."
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button className="btn-primary">
                Create Automation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 