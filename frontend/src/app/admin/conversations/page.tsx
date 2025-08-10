'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../../../contexts/AppContext';
import ContactAvatar from '../../../shared/components/ContactAvatar';
import { useConversationsSync } from '../../../shared/hooks/useConversationsSync';
import { useTags } from '../../../shared/hooks/useTags';
import ConfirmationModal from '../../../shared/components/ConfirmationModal';

interface Conversation {
  id: string;
  contact: {
    id: string;
    name: string;
    number: string;
    avatar?: string;
    isOnline: boolean;
    isGroup: boolean;
  };
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  status: 'active' | 'archived' | 'pinned';
  tags: string[];
  assignedTo?: string;
  lastActivity: Date;
  profileId: string;
  profileName: string;
}

type FilterStatus = 'all' | 'active' | 'archived' | 'pinned';
type SortBy = 'lastActivity' | 'unreadCount' | 'name';
type ViewMode = 'list' | 'grid';

export default function ConversationsPage() {
  const { setCurrentView } = useApp();
  
  // Estados principais
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterProfile, setFilterProfile] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('lastActivity');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [profiles, setProfiles] = useState<any[]>([]);
  
  // Estados de Tags
  const [newTag, setNewTag] = useState('');
  const [tagToDelete, setTagToDelete] = useState<{ id: number; name: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Hook para gerenciar tags
  const { tags, loading: tagsLoading, error: tagsError, createTag, deleteTag } = useTags();
  
  // Estados de UI
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Throttle para evitar atualizações muito frequentes
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const updateThrottle = 2000; // 2 segundos entre atualizações

  // Hook de sincronização
  const {
    conversations,
    stats,
    loading,
    error,
    forceSync,
    updateStatsOnly,
    debugWebSocket,
    testWebSocket
  } = useConversationsSync();

  // Carregar perfis disponíveis
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const response = await fetch('/api/whatsapp/profiles');
        const data = await response.json();
        if (data.success) {
          setProfiles(data.profiles || []);
        }
      } catch (err) {
        console.error('Error loading profiles:', err);
      }
    };
    
    loadProfiles();
  }, []);

  // Monitorar mudanças nas conversas com throttle para evitar piscar
  useEffect(() => {
    const now = Date.now();
    
    // Só atualizar se passou tempo suficiente desde a última atualização
    if (now - lastUpdateTime < updateThrottle) {
      return;
    }
    
    // Só mostrar indicador se houver conversas e mudanças significativas
    if (conversations.length > 0) {
      // Verificar se houve mudanças significativas (não apenas re-renders)
      const hasSignificantChanges = conversations.some(conv => conv.unreadCount > 0) || 
                                   conversations.length > 0;
      
      if (hasSignificantChanges) {
        setLastUpdateTime(now);
      setIsUpdating(true);
        
        // Debounce mais longo para evitar piscar
      const timer = setTimeout(() => {
        setIsUpdating(false);
        }, 1500); // Aumentado para 1.5s para ser mais estável
      
      return () => clearTimeout(timer);
    }
    }
  }, [conversations.length, lastUpdateTime, updateThrottle]); // Dependências otimizadas

  // Definir view atual
  useEffect(() => {
      setCurrentView('conversations');
  }, [setCurrentView]);

    // Filtrar conversas com memoização inteligente e estabilidade
  const filteredConversations = useMemo(() => {
    // Se não há termo de busca e filtros estão em 'all', retornar todas as conversas
    if (!searchTerm && filterStatus === 'all' && filterProfile === 'all') {
      return conversations;
    }
    
    // Usar uma referência estável para evitar re-cálculos desnecessários
    const filtered = conversations.filter(conversation => {
      const matchesSearch = 
        conversation.contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conversation.contact.number.includes(searchTerm) ||
                         conversation.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = filterStatus === 'all' || conversation.status === filterStatus;
    const matchesProfile = filterProfile === 'all' || conversation.profileId === filterProfile;
    
    return matchesSearch && matchesStatus && matchesProfile;
  });

    // Retornar a mesma referência se o resultado for idêntico
    return filtered;
  }, [conversations, searchTerm, filterStatus, filterProfile]);

  // Ordenar conversas com lógica inteligente e estabilidade máxima
  const sortedConversations = useMemo(() => {
    // Debug: Log das primeiras conversas antes da ordenação (reduzido para 2%)
    if (filteredConversations.length > 0 && Math.random() < 0.02) {
      console.log('🔍 Debug - Conversas antes da ordenação:', {
        sortBy,
        totalConversations: filteredConversations.length,
        sampleConversations: filteredConversations.slice(0, 3).map(conv => ({
          name: conv.contact.name,
          lastActivity: conv.lastActivity.toISOString(),
          unreadCount: conv.unreadCount,
          id: conv.id
        }))
      });
    }
    
    // Usar uma cópia estável para evitar mutações
    const conversationsToSort = [...filteredConversations];
    
    return conversationsToSort.sort((a, b) => {
    switch (sortBy) {
        case 'lastActivity': {
          // LÓGICA PRINCIPAL: Não lidas recentes primeiro, depois recentes
          
          // 1. Verificar se ambas têm mensagens não lidas
          const aHasUnread = a.unreadCount > 0;
          const bHasUnread = b.unreadCount > 0;
          
          // 2. Se apenas uma tem não lidas, ela vai primeiro
          if (aHasUnread && !bHasUnread) return -1;
          if (!aHasUnread && bHasUnread) return 1;
          
          // 3. Se ambas têm não lidas ou ambas não têm, ordenar por tempo
          const timeA = a.lastActivity.getTime();
          const timeB = b.lastActivity.getTime();
          const timeDiff = timeB - timeA;
          
          // 4. Se a diferença de tempo for significativa (> 1 segundo), usar apenas tempo
          if (Math.abs(timeDiff) > 1000) {
            return timeDiff;
          }
          
          // 5. Critérios secundários para estabilidade
          // Se ambas têm não lidas, priorizar quantidade
          if (aHasUnread && bHasUnread) {
            const unreadDiff = b.unreadCount - a.unreadCount;
            if (unreadDiff !== 0) return unreadDiff;
          }
          
          // 6. Nome do contato (alfabético) para estabilidade
          const nameDiff = a.contact.name.localeCompare(b.contact.name);
          if (nameDiff !== 0) return nameDiff;
          
          // 7. ID da conversa para estabilidade total
          return a.id.localeCompare(b.id);
        }
          
        case 'unreadCount': {
          // Ordenação por mensagens não lidas, mas com critério de tempo
          const unreadDiff = b.unreadCount - a.unreadCount;
          
          // Se uma tem não lidas e outra não, priorizar não lidas
          if (unreadDiff !== 0) {
            return unreadDiff;
          }
          
          // Se ambas têm a mesma quantidade de não lidas (ou zero), ordenar por tempo
        const timeDiff = b.lastActivity.getTime() - a.lastActivity.getTime();
          if (Math.abs(timeDiff) > 1000) {
            return timeDiff;
          }
          
          // Critérios secundários para estabilidade
          const nameDiff = a.contact.name.localeCompare(b.contact.name);
          if (nameDiff !== 0) return nameDiff;
          
          return a.id.localeCompare(b.id);
        }
          
        case 'name': {
          // Ordenação alfabética, mas com prioridade para não lidas
          const aHasUnread = a.unreadCount > 0;
          const bHasUnread = b.unreadCount > 0;
          
          // Se apenas uma tem não lidas, ela vai primeiro
          if (aHasUnread && !bHasUnread) return -1;
          if (!aHasUnread && bHasUnread) return 1;
          
          // Se ambas têm não lidas ou ambas não têm, ordenar alfabeticamente
          const nameDiff = a.contact.name.localeCompare(b.contact.name);
          if (nameDiff !== 0) return nameDiff;
          
          // Critérios secundários
          const unreadDiff = b.unreadCount - a.unreadCount;
          if (unreadDiff !== 0) return unreadDiff;
          
          const timeDiff = b.lastActivity.getTime() - a.lastActivity.getTime();
          if (Math.abs(timeDiff) > 1000) return timeDiff;
          
          return a.id.localeCompare(b.id);
        }
          
        default:
          // Ordenação padrão: mesma lógica do lastActivity
          const aHasUnread = a.unreadCount > 0;
          const bHasUnread = b.unreadCount > 0;
          
          if (aHasUnread && !bHasUnread) return -1;
          if (!aHasUnread && bHasUnread) return 1;
          
          const timeDiff = b.lastActivity.getTime() - a.lastActivity.getTime();
          if (Math.abs(timeDiff) > 1000) return timeDiff;
          
          if (aHasUnread && bHasUnread) {
        const unreadDiff = b.unreadCount - a.unreadCount;
        if (unreadDiff !== 0) return unreadDiff;
          }
          
          const nameDiff = a.contact.name.localeCompare(b.contact.name);
          if (nameDiff !== 0) return nameDiff;
          
          return a.id.localeCompare(b.id);
      }
    });
    
    // Debug: Log das primeiras conversas após a ordenação (reduzido para 2%)
    if (sortedConversations.length > 0 && Math.random() < 0.02) {
      console.log('✅ Debug - Conversas após ordenação:', {
        sortBy,
        totalConversations: sortedConversations.length,
        sampleConversations: sortedConversations.slice(0, 3).map(conv => ({
          name: conv.contact.name,
          lastActivity: conv.lastActivity.toISOString(),
          unreadCount: conv.unreadCount,
          id: conv.id,
          hasUnread: conv.unreadCount > 0
        }))
      });
    }
    
    // Retornar array estável para evitar re-renders desnecessários
    return sortedConversations;
  }, [filteredConversations, sortBy]);

  // Calcular estatísticas em tempo real
  const realTimeStats = useMemo(() => {
    const totalConversations = filteredConversations.length;
    const unreadMessages = filteredConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
    const activeProfiles = profiles.length;
    const highPriority = filteredConversations.filter(c => c.unreadCount > 0).length;

    return {
      totalConversations,
      unreadMessages,
      activeProfiles,
      highPriority
    };
  }, [filteredConversations, profiles]);

  // Funções auxiliares
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pinned': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const showNotificationMessage = useCallback((message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  }, []);

  // Função para adicionar tag
  const handleAddTag = useCallback(async () => {
    const tagToAdd = newTag.trim();
    if (tagToAdd) {
      const success = await createTag(tagToAdd);
      if (success) {
        setNewTag('');
        showNotificationMessage(`Tag "${tagToAdd}" criada com sucesso`);
      } else {
        showNotificationMessage('Erro ao criar tag');
      }
    }
  }, [newTag, createTag, showNotificationMessage]);

  // Função para remover tag
  const handleRemoveTag = useCallback((tag: { id: number; name: string }) => {
    setTagToDelete(tag);
    setShowDeleteModal(true);
  }, []);

  // Função para confirmar exclusão de tag
  const handleConfirmDeleteTag = useCallback(async () => {
    if (tagToDelete) {
      const success = await deleteTag(tagToDelete.id);
      if (success) {
        showNotificationMessage(`Tag "${tagToDelete.name}" excluída com sucesso`);
      } else {
        showNotificationMessage('Erro ao excluir tag');
      }
      setShowDeleteModal(false);
      setTagToDelete(null);
    }
  }, [tagToDelete, deleteTag, showNotificationMessage]);

  const handleConversationClick = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
    showNotificationMessage(`Selected conversation with ${conversation.contact.name}`);
  }, [showNotificationMessage]);

  const handleForceSync = useCallback(() => {
    forceSync();
    showNotificationMessage('Forcing sync...');
  }, [forceSync, showNotificationMessage]);

  const handleDebugWebSocket = useCallback(() => {
    debugWebSocket();
    showNotificationMessage('Debug info logged to console');
  }, [debugWebSocket, showNotificationMessage]);

  const handleTestWebSocket = useCallback(() => {
    testWebSocket();
    showNotificationMessage('WebSocket test sent');
  }, [testWebSocket, showNotificationMessage]);

  const handleExportConversations = useCallback(() => {
    const data = sortedConversations.map(conv => ({
      name: conv.contact.name,
      number: conv.contact.number,
      lastMessage: conv.lastMessage,
      unreadCount: conv.unreadCount,
      status: conv.status,
      profileName: conv.profileName,
      lastActivity: conv.lastActivity.toISOString()
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversations-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotificationMessage('Conversations exported successfully');
  }, [sortedConversations, showNotificationMessage]);

  const handleNewConversation = useCallback(() => {
    showNotificationMessage('New conversation feature coming soon');
  }, [showNotificationMessage]);

  // Renderizar estatísticas
  const renderStatsCard = (title: string, value: number, icon: string, color: string, subtitle: string) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 card-enhanced">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-400 mt-1 flex items-center">
            <span className={`w-2 h-2 ${color} rounded-full mr-1 animate-pulse`}></span>
            {subtitle}
          </p>
        </div>
        <div className={`w-12 h-12 ${color.replace('bg-', 'bg-').replace('400', '100')} rounded-xl flex items-center justify-center`}>
          <i className={`${icon} ${color.replace('bg-', 'text-')} text-xl`}></i>
        </div>
      </div>
    </div>
  );

  // Renderizar conversa individual com chave estável
  const renderConversation = (conversation: Conversation) => (
    <div
      key={`${conversation.id}-${conversation.profileId}-${conversation.unreadCount}-${conversation.lastActivity.getTime()}`}
      className={`p-6 hover:bg-gray-50 transition-all duration-200 cursor-pointer ${
        selectedConversation?.id === conversation.id ? 'bg-green-50 border-l-4 border-green-500' : ''
      } ${conversation.unreadCount > 0 ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
      onClick={() => handleConversationClick(conversation)}
    >
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <ContactAvatar
            contactId={conversation.contact.id}
            name={conversation.contact.name}
            avatar={conversation.contact.avatar}
            isGroup={conversation.contact.isGroup}
            size="lg"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className={`text-sm font-semibold truncate ${
                conversation.unreadCount > 0 ? 'text-blue-900 font-bold' : 'text-gray-900'
              }`}>
                {conversation.contact.name}
              </h3>
              {conversation.contact.isOnline && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              )}
              {conversation.contact.isGroup && (
                <i className="fas fa-users text-gray-400 text-xs"></i>
              )}
              {conversation.unreadCount > 0 && (
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">{conversation.lastTime}</span>
              {conversation.unreadCount > 0 && (
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                  {conversation.unreadCount}
                </span>
              )}
            </div>
          </div>

          <p className={`text-sm mt-1 line-clamp-2 ${
            conversation.unreadCount > 0 ? 'text-blue-700 font-medium' : 'text-gray-600'
          }`}>
            {conversation.lastMessage}
          </p>

          {/* Tags and Status */}
          <div className="flex items-center space-x-2 mt-3">
            {conversation.tags.map((tag, index) => (
              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {tag}
              </span>
            ))}
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(conversation.status)}`}>
              {conversation.status}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              <i className="fas fa-user-circle mr-1"></i>
              {conversation.profileName}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center space-x-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <i className="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Layout reorganizado */}
        
        {/* Primeira linha: Header + Tags */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Header Principal */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-[250px]">
            <div className="flex flex-col h-full">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Conversations</h1>
                <p className="text-gray-600 mb-3">
                  Manage and monitor all WhatsApp conversations
                </p>
                {/* Indicador de sincronização simplificado */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                    <span className="text-sm text-gray-600">
                      {loading ? 'Syncing...' : 'Real-time sync active'}
                    </span>
                  </div>
                  {isUpdating && (
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                      <span className="text-sm text-blue-600">Updating...</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={handleForceSync}
                  className="btn-secondary flex items-center space-x-2 text-sm px-3 py-2"
                  disabled={loading}
                >
                  <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''} text-xs`}></i>
                  <span>{loading ? 'Syncing...' : 'Sync Now'}</span>
                </button>
                <button 
                  onClick={handleDebugWebSocket}
                  className="btn-secondary flex items-center space-x-2 text-sm px-3 py-2"
                >
                  <i className="fas fa-bug text-xs"></i>
                  <span>Debug</span>
                </button>
                <button 
                  onClick={handleTestWebSocket}
                  className="btn-secondary flex items-center space-x-2 text-sm px-3 py-2"
                >
                  <i className="fas fa-wifi text-xs"></i>
                  <span>Test WS</span>
                </button>
                <button 
                  onClick={handleNewConversation}
                  className="btn-primary flex items-center space-x-2 text-sm px-3 py-2"
                >
                  <i className="fas fa-plus text-xs"></i>
                  <span>New Conversation</span>
                </button>
                <button 
                  onClick={handleExportConversations}
                  className="btn-secondary flex items-center space-x-2 text-sm px-3 py-2"
                >
                  <i className="fas fa-download text-xs"></i>
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>

          {/* Grid de Tags */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-[250px]">
            <div className="flex flex-col h-full">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Tags</h3>
                <p className="text-sm text-gray-600">Manage conversation tags</p>
              </div>
              
              <div className="flex-1">
                {/* Input para adicionar nova tag */}
                <div className="mb-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Enter new tag..."
                      className="input-enhanced flex-1 text-sm"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <button 
                      onClick={handleAddTag}
                      disabled={!newTag.trim()}
                      className="btn-primary px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className="fas fa-plus text-xs mr-1"></i>
                      Add
                    </button>
                  </div>
                </div>
                
                {/* Lista de tags existentes com scroll */}
                <div className="space-y-1 max-h-12 overflow-y-auto pr-2">
                  {tagsLoading ? (
                    <div className="text-center py-2 text-gray-500">
                      <i className="fas fa-spinner fa-spin text-sm"></i>
                      <p className="text-xs">Carregando tags...</p>
                    </div>
                  ) : tags.length > 0 ? (
                    tags.map((tag) => (
                      <div key={tag.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">{tag.name}</span>
                        <button 
                          onClick={() => handleRemoveTag(tag)}
                          className="text-red-500 hover:text-red-700 text-xs p-1 hover:bg-red-50 rounded"
                          title="Remover tag"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <i className="fas fa-tags text-lg mb-1"></i>
                      <p className="text-xs">Nenhuma tag criada ainda</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-3 pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-500 text-center">
                  <i className="fas fa-info-circle mr-1"></i>
                  Tags help organize conversations
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Segunda linha: Filtros (largura total) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 h-[100px]">
          <div className="flex items-center h-full space-x-8">
            {/* Search - 35% do espaço */}
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-enhanced pl-8 pr-3 py-2.5 text-sm w-full"
                />
              </div>
            </div>

            {/* Filters Group - 65% do espaço */}
            <div className="flex items-center space-x-6 flex-1">
              {/* Profile Filter */}
              <div className="flex-1 min-w-0">
                <select
                  value={filterProfile}
                  onChange={(e) => setFilterProfile(e.target.value)}
                  className="input-enhanced text-sm w-full py-2.5"
                >
                  <option value="all">All Profiles</option>
                  {profiles.map(profile => (
                    <option key={profile.id} value={profile.id.toString()}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex-1 min-w-0">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                  className="input-enhanced text-sm w-full py-2.5"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                  <option value="pinned">Pinned</option>
                </select>
              </div>

              {/* Sort by */}
              <div className="flex-1 min-w-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="input-enhanced text-sm w-full py-2.5"
                >
                  <option value="lastActivity">Last Activity</option>
                  <option value="unreadCount">Unread Count</option>
                  <option value="name">Name</option>
                </select>
              </div>

              {/* View Mode - Largura fixa */}
              <div className="flex items-center space-x-1 flex-shrink-0">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 rounded-lg transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-green-500 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="List View"
                >
                  <i className="fas fa-list text-sm"></i>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 rounded-lg transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-green-500 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Grid View"
                >
                  <i className="fas fa-th-large text-sm"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderStatsCard(
            'Total Conversations',
            realTimeStats.totalConversations,
            'fas fa-comments',
            'bg-blue-400',
            filterProfile === 'all' ? 'All profiles' : 'Filtered'
          )}
          {renderStatsCard(
            'Unread Messages',
            realTimeStats.unreadMessages,
            'fas fa-envelope',
            'bg-red-400',
            'Live counter'
          )}
          {renderStatsCard(
            'Active Profiles',
            realTimeStats.activeProfiles,
            'fas fa-check-circle',
            'bg-green-400',
            'Connected'
          )}
          {renderStatsCard(
            'High Priority',
            realTimeStats.highPriority,
            'fas fa-exclamation-triangle',
            'bg-orange-400',
            'Needs attention'
          )}
        </div>

        {/* Conversations List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">All Conversations</h2>
            <p className="text-sm text-gray-600 mt-1">
              {loading ? 'Loading conversations...' : `Showing ${sortedConversations.length} of ${conversations.length} conversations`}
            </p>
          </div>
          
          {/* Notification */}
          {showNotification && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <div className="flex items-center">
                <i className="fas fa-bell text-green-400 mr-2"></i>
                <span className="text-green-700 text-sm">{notificationMessage}</span>
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {loading && (
            <div className="p-12 text-center">
              <div className="inline-flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                <span className="text-gray-600">Loading conversations...</span>
              </div>
            </div>
          )}
          
          {/* Error State */}
          {error && !loading && (
            <div className="p-6 text-center">
              <div className="inline-flex items-center space-x-2 text-orange-600">
                <i className="fas fa-exclamation-triangle"></i>
                <span>{error}</span>
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {!loading && !error && sortedConversations.length === 0 && (
            <div className="p-12 text-center">
              <div className="inline-flex flex-col items-center space-y-2 text-gray-500">
                <i className="fas fa-comments text-4xl"></i>
                <span>No conversations found</span>
                {searchTerm && (
                  <p className="text-sm">Try adjusting your search or filters</p>
                )}
              </div>
            </div>
          )}

          {/* Conversations List */}
          {!loading && !error && sortedConversations.length > 0 && (
            <div className="divide-y divide-gray-100">
              {sortedConversations.map(renderConversation)}
          </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação para Excluir Tag */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setTagToDelete(null);
        }}
        onConfirm={handleConfirmDeleteTag}
        title="Excluir Tag"
        message={`Tem certeza que deseja excluir a tag "${tagToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}