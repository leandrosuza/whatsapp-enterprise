'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AppView = 'shared-whatsapp';

// Tipo para controlar sub-páginas dentro das páginas principais
type SubView = 'none' | 'whatsapp-view';

// Interface para representar um estado de tela
interface ViewState {
  view: AppView;
  subView: SubView;
  params: { profileId?: string; profileName?: string; contactNumber?: string };
  timestamp: number;
}

// Interface para o estado preservado de cada tela
interface PreservedState {
  [key: string]: any;
}

interface SharedAppContextType {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  subView: SubView;
  setSubView: (subView: SubView) => void;
  viewParams: { profileId?: string; profileName?: string; contactNumber?: string };
  setViewParams: (params: { profileId?: string; profileName?: string; contactNumber?: string }) => void;
  
  // Sistema de navegação inteligente
  navigationHistory: ViewState[];
  canGoBack: boolean;
  goBack: () => void;
  goToView: (view: AppView, subView?: SubView, params?: any) => void;
  
  // Sistema de preservação de estado
  getPreservedState: (viewKey: string) => any;
  setPreservedState: (viewKey: string, state: any) => void;
  clearPreservedState: (viewKey: string) => void;
  
  // Identificador único para esta instância
  instanceId: string;
}

const SharedAppContext = createContext<SharedAppContextType | undefined>(undefined);

export const useSharedApp = () => {
  const context = useContext(SharedAppContext);
  if (context === undefined) {
    throw new Error('useSharedApp must be used within a SharedAppProvider');
  }
  return context;
};

interface SharedAppProviderProps {
  children: ReactNode;
  profileId?: string;
}

export const SharedAppProvider: React.FC<SharedAppProviderProps> = ({ children, profileId }) => {
  // Gerar ID único para esta instância
  const [instanceId] = useState(() => `shared-${profileId || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  const [currentView, setCurrentView] = useState<AppView>('shared-whatsapp');
  const [subView, setSubView] = useState<SubView>('whatsapp-view');
  const [viewParams, setViewParams] = useState<{ profileId?: string; profileName?: string; contactNumber?: string }>({
    profileId: profileId
  });
  
  // Sistema de histórico de navegação
  const [navigationHistory, setNavigationHistory] = useState<ViewState[]>([
    { view: 'shared-whatsapp', subView: 'whatsapp-view', params: { profileId }, timestamp: Date.now() }
  ]);
  
  // Sistema de preservação de estado das telas
  const [preservedStates, setPreservedStates] = useState<PreservedState>({});

  // Debug: log quando o estado muda
  useEffect(() => {
    console.log(`🔄 SharedAppContext [${instanceId}] - State changed:`, { currentView, subView, viewParams });
  }, [currentView, subView, viewParams, instanceId]);

  // Função para gerar chave única para cada tela
  const getViewKey = (view: AppView, subView: SubView = 'none') => {
    return `${instanceId}-${view}-${subView}`;
  };

  // Função para navegar para uma tela preservando o histórico
  const goToView = (view: AppView, newSubView: SubView = 'none', params: any = {}) => {
    console.log(`🔄 SharedAppContext [${instanceId}] - Navigating to:`, { view, newSubView, params });
    
    // Salvar estado atual antes de navegar
    const currentViewKey = getViewKey(currentView, subView);
    const currentState = {
      view: currentView,
      subView: subView,
      params: viewParams,
      timestamp: Date.now()
    };
    
    // Atualizar histórico
    setNavigationHistory(prev => [...prev, currentState]);
    
    // Atualizar estado
    setCurrentView(view);
    setSubView(newSubView);
    setViewParams(params);
  };

  // Função para voltar
  const goBack = () => {
    if (navigationHistory.length > 1) {
      const previousState = navigationHistory[navigationHistory.length - 2];
      setNavigationHistory(prev => prev.slice(0, -1));
      setCurrentView(previousState.view);
      setSubView(previousState.subView);
      setViewParams(previousState.params);
    }
  };

  // Sistema de preservação de estado
  const getPreservedState = (viewKey: string) => {
    const fullKey = `${instanceId}-${viewKey}`;
    return preservedStates[fullKey];
  };

  const setPreservedState = (viewKey: string, state: any) => {
    const fullKey = `${instanceId}-${viewKey}`;
    setPreservedStates(prev => ({
      ...prev,
      [fullKey]: state
    }));
  };

  const clearPreservedState = (viewKey: string) => {
    const fullKey = `${instanceId}-${viewKey}`;
    setPreservedStates(prev => {
      const newState = { ...prev };
      delete newState[fullKey];
      return newState;
    });
  };

  // Handlers para atualizar estado
  const handleSetCurrentView = (view: AppView) => {
    console.log(`🔄 SharedAppContext [${instanceId}] - Setting currentView:`, view);
    setCurrentView(view);
  };

  const handleSetSubView = (newSubView: SubView) => {
    console.log(`🔄 SharedAppContext [${instanceId}] - Setting subView:`, newSubView);
    setSubView(newSubView);
  };

  const handleSetViewParams = (params: { profileId?: string; profileName?: string; contactNumber?: string }) => {
    console.log(`🔄 SharedAppContext [${instanceId}] - Setting viewParams:`, params);
    setViewParams(params);
  };

  const canGoBack = navigationHistory.length > 1;

  const value: SharedAppContextType = {
    currentView,
    setCurrentView: handleSetCurrentView,
    subView,
    setSubView: handleSetSubView,
    viewParams,
    setViewParams: handleSetViewParams,
    navigationHistory,
    canGoBack,
    goBack,
    goToView,
    getPreservedState,
    setPreservedState,
    clearPreservedState,
    instanceId
  };

  return (
    <SharedAppContext.Provider value={value}>
      {children}
    </SharedAppContext.Provider>
  );
}; 