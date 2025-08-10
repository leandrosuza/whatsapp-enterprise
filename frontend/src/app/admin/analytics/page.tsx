'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../../../contexts/AppContext';

interface Profile {
  id: string;
  name: string;
  status: string;
  isActive: boolean;
  isConnected: boolean;
}

interface AnalyticsData {
  messages: {
    total: number;
    sent: number;
    received: number;
    delivered: number;
    read: number;
    failed: number;
  };
  conversations: {
    total: number;
    active: number;
    resolved: number;
    avgResponseTime: number;
  };
  contacts: {
    total: number;
    new: number;
    active: number;
    engaged: number;
  };
  performance: {
    responseRate: number;
    satisfactionScore: number;
    conversionRate: number;
    avgMessagesPerDay: number;
  };
  timeSeries: {
    date: string;
    messages: number;
    conversations: number;
    contacts: number;
  }[];
  topContacts: {
    name: string;
    messages: number;
    lastActivity: string;
    status: string;
  }[];
  automationStats: {
    name: string;
    sent: number;
    delivered: number;
    conversionRate: number;
  }[];
}

// Dados fictícios para diferentes perfis
const generateProfileData = (profileId: string, profileName: string): AnalyticsData => {
  const baseMultiplier = parseInt(profileId) || 1;
  const isActive = profileName.toLowerCase().includes('ativo') || profileName.toLowerCase().includes('active');
  const multiplier = isActive ? baseMultiplier * 1.5 : baseMultiplier * 0.8;
  
  return {
    messages: {
      total: Math.floor(15420 * multiplier),
      sent: Math.floor(8920 * multiplier),
      received: Math.floor(6500 * multiplier),
      delivered: Math.floor(8750 * multiplier),
      read: Math.floor(7200 * multiplier),
      failed: Math.floor(170 * multiplier)
    },
    conversations: {
      total: Math.floor(1247 * multiplier),
      active: Math.floor(89 * multiplier),
      resolved: Math.floor(1158 * multiplier),
      avgResponseTime: 2.3 + (Math.random() - 0.5) * 2
    },
    contacts: {
      total: Math.floor(3420 * multiplier),
      new: Math.floor(156 * multiplier),
      active: Math.floor(2890 * multiplier),
      engaged: Math.floor(2100 * multiplier)
    },
    performance: {
      responseRate: 94.2 + (Math.random() - 0.5) * 10,
      satisfactionScore: 4.6 + (Math.random() - 0.5) * 0.8,
      conversionRate: 18.7 + (Math.random() - 0.5) * 15,
      avgMessagesPerDay: Math.floor(245 * multiplier)
    },
    timeSeries: [
      { date: '2024-04-01', messages: Math.floor(245 * multiplier), conversations: Math.floor(23 * multiplier), contacts: Math.floor(45 * multiplier) },
      { date: '2024-04-02', messages: Math.floor(289 * multiplier), conversations: Math.floor(28 * multiplier), contacts: Math.floor(52 * multiplier) },
      { date: '2024-04-03', messages: Math.floor(312 * multiplier), conversations: Math.floor(31 * multiplier), contacts: Math.floor(48 * multiplier) },
      { date: '2024-04-04', messages: Math.floor(267 * multiplier), conversations: Math.floor(25 * multiplier), contacts: Math.floor(41 * multiplier) },
      { date: '2024-04-05', messages: Math.floor(298 * multiplier), conversations: Math.floor(29 * multiplier), contacts: Math.floor(55 * multiplier) },
      { date: '2024-04-06', messages: Math.floor(234 * multiplier), conversations: Math.floor(22 * multiplier), contacts: Math.floor(38 * multiplier) },
      { date: '2024-04-07', messages: Math.floor(276 * multiplier), conversations: Math.floor(26 * multiplier), contacts: Math.floor(43 * multiplier) }
    ],
    topContacts: [
      { name: `${profileName} - João Silva`, messages: Math.floor(156 * multiplier), lastActivity: '2h ago', status: 'active' },
      { name: `${profileName} - Maria Santos`, messages: Math.floor(134 * multiplier), lastActivity: '1h ago', status: 'active' },
      { name: `${profileName} - Pedro Costa`, messages: Math.floor(98 * multiplier), lastActivity: '30m ago', status: 'active' },
      { name: `${profileName} - Ana Oliveira`, messages: Math.floor(87 * multiplier), lastActivity: '4h ago', status: 'inactive' },
      { name: `${profileName} - Carlos Ferreira`, messages: Math.floor(76 * multiplier), lastActivity: '1d ago', status: 'inactive' }
    ],
    automationStats: [
      { name: `${profileName} - Welcome Message`, sent: Math.floor(1247 * multiplier), delivered: Math.floor(1189 * multiplier), conversionRate: 19.7 + (Math.random() - 0.5) * 10 },
      { name: `${profileName} - Follow-up Campaign`, sent: Math.floor(856 * multiplier), delivered: Math.floor(823 * multiplier), conversionRate: 17.6 + (Math.random() - 0.5) * 10 },
      { name: `${profileName} - Order Reminder`, sent: Math.floor(342 * multiplier), delivered: Math.floor(328 * multiplier), conversionRate: 26.0 + (Math.random() - 0.5) * 10 },
      { name: `${profileName} - Support Follow-up`, sent: Math.floor(156 * multiplier), delivered: Math.floor(142 * multiplier), conversionRate: 28.8 + (Math.random() - 0.5) * 10 }
    ]
  };
};

// Dados agregados para "Selecionar Todos"
const generateAggregatedData = (profiles: Profile[]): AnalyticsData => {
  const allProfilesData = profiles.map(profile => generateProfileData(profile.id, profile.name));
  
  return {
    messages: {
      total: allProfilesData.reduce((sum, data) => sum + data.messages.total, 0),
      sent: allProfilesData.reduce((sum, data) => sum + data.messages.sent, 0),
      received: allProfilesData.reduce((sum, data) => sum + data.messages.received, 0),
      delivered: allProfilesData.reduce((sum, data) => sum + data.messages.delivered, 0),
      read: allProfilesData.reduce((sum, data) => sum + data.messages.read, 0),
      failed: allProfilesData.reduce((sum, data) => sum + data.messages.failed, 0)
    },
    conversations: {
      total: allProfilesData.reduce((sum, data) => sum + data.conversations.total, 0),
      active: allProfilesData.reduce((sum, data) => sum + data.conversations.active, 0),
      resolved: allProfilesData.reduce((sum, data) => sum + data.conversations.resolved, 0),
      avgResponseTime: allProfilesData.reduce((sum, data) => sum + data.conversations.avgResponseTime, 0) / allProfilesData.length
    },
    contacts: {
      total: allProfilesData.reduce((sum, data) => sum + data.contacts.total, 0),
      new: allProfilesData.reduce((sum, data) => sum + data.contacts.new, 0),
      active: allProfilesData.reduce((sum, data) => sum + data.contacts.active, 0),
      engaged: allProfilesData.reduce((sum, data) => sum + data.contacts.engaged, 0)
    },
    performance: {
      responseRate: allProfilesData.reduce((sum, data) => sum + data.performance.responseRate, 0) / allProfilesData.length,
      satisfactionScore: allProfilesData.reduce((sum, data) => sum + data.performance.satisfactionScore, 0) / allProfilesData.length,
      conversionRate: allProfilesData.reduce((sum, data) => sum + data.performance.conversionRate, 0) / allProfilesData.length,
      avgMessagesPerDay: allProfilesData.reduce((sum, data) => sum + data.performance.avgMessagesPerDay, 0)
    },
    timeSeries: allProfilesData[0]?.timeSeries.map((_, index) => ({
      date: allProfilesData[0].timeSeries[index].date,
      messages: allProfilesData.reduce((sum, data) => sum + data.timeSeries[index].messages, 0),
      conversations: allProfilesData.reduce((sum, data) => sum + data.timeSeries[index].conversations, 0),
      contacts: allProfilesData.reduce((sum, data) => sum + data.timeSeries[index].contacts, 0)
    })) || [],
    topContacts: allProfilesData.flatMap(data => data.topContacts).sort((a, b) => b.messages - a.messages).slice(0, 5),
    automationStats: allProfilesData.flatMap(data => data.automationStats).sort((a, b) => b.sent - a.sent).slice(0, 4)
  };
};

export default function AnalyticsPage() {
  const { setCurrentView } = useApp();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('all');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [selectedMetric, setSelectedMetric] = useState<'messages' | 'conversations' | 'contacts'>('messages');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setCurrentView('analytics');
  }, [setCurrentView]);

  // Carregar perfis do sistema
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/whatsapp/profiles');
        if (response.ok) {
          const data = await response.json();
          const mappedProfiles = data.map((p: any) => ({
            id: p.id.toString(),
            name: p.name || `Profile ${p.id}`,
            status: p.status || 'disconnected',
            isActive: p.isActive !== false,
            isConnected: p.isConnected || p.status === 'connected'
          }));
          setProfiles(mappedProfiles);
          
          // Se não há perfis, usar dados padrão
          if (mappedProfiles.length === 0) {
            setAnalyticsData(generateProfileData('1', 'Default Profile'));
          }
        }
      } catch (error) {
        console.error('Error loading profiles:', error);
        // Usar dados padrão em caso de erro
        setAnalyticsData(generateProfileData('1', 'Default Profile'));
      } finally {
        setIsLoading(false);
      }
    };

    loadProfiles();
  }, []);

  // Atualizar dados baseado no perfil selecionado
  useEffect(() => {
    if (profiles.length === 0) return;

    if (selectedProfile === 'all') {
      setAnalyticsData(generateAggregatedData(profiles));
    } else {
      const profile = profiles.find(p => p.id === selectedProfile);
      if (profile) {
        setAnalyticsData(generateProfileData(profile.id, profile.name));
      }
    }
  }, [selectedProfile, profiles]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'inactive': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return 'fas fa-circle text-green-500';
      case 'inactive': return 'fas fa-circle text-gray-400';
      default: return 'fas fa-circle text-gray-400';
    }
  };

  const getProfileStatusColor = (profile: Profile) => {
    if (profile.isConnected) return 'text-green-600';
    if (profile.isActive) return 'text-blue-600';
    return 'text-gray-600';
  };

  const getProfileStatusIcon = (profile: Profile) => {
    if (profile.isConnected) return 'fas fa-circle text-green-500';
    if (profile.isActive) return 'fas fa-circle text-blue-500';
    return 'fas fa-circle text-gray-400';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando análises...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Análise</h1>
              <p className="text-gray-600 mt-1">Visualize insights detalhados e métricas de performance</p>
              {selectedProfile === 'all' ? (
                <div className="flex items-center space-x-2 mt-2">
                  <i className="fas fa-chart-pie text-blue-500 text-xs"></i>
                  <span className="text-sm text-blue-600 font-medium">
                    Dados agregados de todos os perfis ({profiles.length} perfis)
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-sm text-gray-500">Perfil selecionado:</span>
                  {(() => {
                    const profile = profiles.find(p => p.id === selectedProfile);
                    return profile ? (
                      <div className="flex items-center space-x-2">
                        <i className={`${getProfileStatusIcon(profile)} text-xs`}></i>
                        <span className={`text-sm font-medium ${getProfileStatusColor(profile)}`}>
                          {profile.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({profile.isConnected ? 'Conectado' : profile.isActive ? 'Ativo' : 'Inativo'})
                        </span>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Filtro de Perfis */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Perfil:</label>
                <select
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="input-enhanced min-w-[200px]"
                >
                  <option value="all">📊 Selecionar Todos</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.isConnected ? '🟢' : profile.isActive ? '🔵' : '⚪'} {profile.name}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="input-enhanced"
              >
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
              </select>
              <button className="btn-secondary flex items-center space-x-2">
                <i className="fas fa-download text-sm"></i>
                <span>Exportar Relatório</span>
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 card-enhanced">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Mensagens</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(analyticsData.messages.total)}</p>
                <p className="text-xs text-green-600 mt-1">+12.5% da semana passada</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-comments text-blue-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 card-enhanced">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversas Ativas</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.conversations.active}</p>
                <p className="text-xs text-green-600 mt-1">+8.3% da semana passada</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-comment-dots text-green-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 card-enhanced">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Resposta</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.performance.responseRate.toFixed(1)}%</p>
                <p className="text-xs text-green-600 mt-1">+2.1% da semana passada</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-chart-line text-purple-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 card-enhanced">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Score de Satisfação</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.performance.satisfactionScore.toFixed(1)}/5</p>
                <p className="text-xs text-green-600 mt-1">+0.2 da semana passada</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-star text-orange-600 text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Message Statistics */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas de Mensagens</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Enviadas</span>
                <span className="text-sm font-semibold text-gray-900">{formatNumber(analyticsData.messages.sent)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Recebidas</span>
                <span className="text-sm font-semibold text-gray-900">{formatNumber(analyticsData.messages.received)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Entregues</span>
                <span className="text-sm font-semibold text-gray-900">{formatNumber(analyticsData.messages.delivered)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Lidas</span>
                <span className="text-sm font-semibold text-gray-900">{formatNumber(analyticsData.messages.read)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Falharam</span>
                <span className="text-sm font-semibold text-red-600">{formatNumber(analyticsData.messages.failed)}</span>
              </div>
            </div>
          </div>

          {/* Conversation Metrics */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas de Conversas</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total de Conversas</span>
                <span className="text-sm font-semibold text-gray-900">{formatNumber(analyticsData.conversations.total)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Resolvidas</span>
                <span className="text-sm font-semibold text-green-600">{formatNumber(analyticsData.conversations.resolved)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tempo Médio de Resposta</span>
                <span className="text-sm font-semibold text-gray-900">{analyticsData.conversations.avgResponseTime.toFixed(1)}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Taxa de Resolução</span>
                <span className="text-sm font-semibold text-green-600">
                  {((analyticsData.conversations.resolved / analyticsData.conversations.total) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Contact Metrics */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas de Contatos</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total de Contatos</span>
                <span className="text-sm font-semibold text-gray-900">{formatNumber(analyticsData.contacts.total)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Novos Esta Semana</span>
                <span className="text-sm font-semibold text-blue-600">{formatNumber(analyticsData.contacts.new)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ativos</span>
                <span className="text-sm font-semibold text-green-600">{formatNumber(analyticsData.contacts.active)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Engajados</span>
                <span className="text-sm font-semibold text-purple-600">{formatNumber(analyticsData.contacts.engaged)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time Series Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Atividade ao Longo do Tempo</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedMetric('messages')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedMetric === 'messages' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Mensagens
                </button>
                <button
                  onClick={() => setSelectedMetric('conversations')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedMetric === 'conversations' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Conversas
                </button>
                <button
                  onClick={() => setSelectedMetric('contacts')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedMetric === 'contacts' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Contatos
                </button>
              </div>
            </div>
            
            {/* Simple Chart Visualization */}
            <div className="h-64 flex items-end justify-between space-x-2">
              {analyticsData.timeSeries.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg transition-all duration-300 hover:from-blue-600 hover:to-blue-400"
                    style={{ 
                      height: `${(data[selectedMetric] / Math.max(...analyticsData.timeSeries.map(d => d[selectedMetric]))) * 200}px` 
                    }}
                  ></div>
                  <span className="text-xs text-gray-500 mt-2">
                    {new Date(data.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Automation Performance */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance de Automações</h3>
            <div className="space-y-4">
              {analyticsData.automationStats.map((automation, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{automation.name}</h4>
                    <p className="text-xs text-gray-600">{formatNumber(automation.sent)} enviadas, {formatNumber(automation.delivered)} entregues</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{automation.conversionRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-600">conversão</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Contacts */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Principais Contatos Ativos</h3>
            <p className="text-sm text-gray-600 mt-1">Contatos mais engajados esta semana</p>
          </div>
          
          <div className="divide-y divide-gray-100">
            {analyticsData.topContacts.map((contact, index) => (
              <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {contact.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{contact.name}</h4>
                      <p className="text-xs text-gray-500">{contact.messages} mensagens</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-gray-500">{contact.lastActivity}</span>
                    <div className="flex items-center space-x-1">
                      <i className={`${getStatusIcon(contact.status)} text-xs`}></i>
                      <span className={`text-xs font-medium ${getStatusColor(contact.status)}`}>
                        {contact.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 