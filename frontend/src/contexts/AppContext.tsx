'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AppView = 'dashboard' | 'view' | 'conversations' | 'contacts' | 'lead-generator' | 'automations' | 'analytics' | 'settings';

// Type to control sub-pages within main pages
type SubView = 'none' | 'whatsapp-view';

// Interface to represent a screen state
interface ViewState {
  view: AppView;
  subView: SubView;
  params: { profileId?: string; profileName?: string; contactNumber?: string };
  timestamp: number;
}

// Interface for preserved state of each screen
interface PreservedState {
  [key: string]: any;
}

interface AppContextType {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  subView: SubView;
  setSubView: (subView: SubView) => void;
  viewParams: { profileId?: string; profileName?: string; contactNumber?: string };
  setViewParams: (params: { profileId?: string; profileName?: string; contactNumber?: string }) => void;
  
  // Intelligent navigation system
  navigationHistory: ViewState[];
  canGoBack: boolean;
  goBack: () => void;
  goToView: (view: AppView, subView?: SubView, params?: any) => void;
  
  // State preservation system
  getPreservedState: (viewKey: string) => any;
  setPreservedState: (viewKey: string, state: any) => void;
  clearPreservedState: (viewKey: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [subView, setSubView] = useState<SubView>('none');
  const [viewParams, setViewParams] = useState<{ profileId?: string; profileName?: string; contactNumber?: string }>({});
  
  // Navigation history system
  const [navigationHistory, setNavigationHistory] = useState<ViewState[]>([
    { view: 'dashboard', subView: 'none', params: {}, timestamp: Date.now() }
  ]);
  
  // Screen state preservation system
  const [preservedStates, setPreservedStates] = useState<PreservedState>({});

  // Debug: log when state changes
  useEffect(() => {
    console.log('🔄 AppContext - State changed:', { currentView, subView, viewParams });
  }, [currentView, subView, viewParams]);

  // Ensure there's always an initial view
  useEffect(() => {
    if (!currentView) {
      console.log('🔄 AppContext - No currentView, setting to dashboard');
      setCurrentView('dashboard');
    }
  }, [currentView, setCurrentView]);

  // Function to generate unique key for each screen
  const getViewKey = (view: AppView, subView: SubView = 'none') => {
    return `${view}-${subView}`;
  };

  // Function to navigate to a screen preserving history
  const goToView = (view: AppView, newSubView: SubView = 'none', params: any = {}) => {
    console.log('🔄 AppContext - Navigating to:', { view, newSubView, params });
    
    // Save current state before navigating
    const currentViewKey = getViewKey(currentView, subView);
    const currentState = {
      view: currentView,
      subView: subView,
      params: viewParams,
      timestamp: Date.now()
    };
    
    // Adicionar ao histórico se não for a mesma tela
    if (currentView !== view || subView !== newSubView) {
      setNavigationHistory(prev => {
        const newHistory = [...prev, currentState];
        // Manter apenas os últimos 10 estados para evitar vazamento de memória
        return newHistory.slice(-10);
      });
    }
    
    // Navegar para a nova tela
    setCurrentView(view);
    setSubView(newSubView);
    setViewParams(params);
    
    console.log('✅ AppContext - Navigated to:', { view, newSubView, params });
  };

  // Função para voltar ao estado anterior
  const goBack = () => {
    if (navigationHistory.length > 1) {
      const previousState = navigationHistory[navigationHistory.length - 2];
      const currentHistory = navigationHistory.slice(0, -1);
      
      setNavigationHistory(currentHistory);
      setCurrentView(previousState.view);
      setSubView(previousState.subView);
      setViewParams(previousState.params);
      
      console.log('🔄 AppContext - Going back to:', previousState);
    }
  };

  // Função para obter estado preservado de uma tela
  const getPreservedState = (viewKey: string) => {
    return preservedStates[viewKey] || null;
  };

  // Função para salvar estado de uma tela
  const setPreservedState = (viewKey: string, state: any) => {
    setPreservedStates(prev => ({
      ...prev,
      [viewKey]: {
        ...state,
        lastUpdated: Date.now()
      }
    }));
    console.log('💾 AppContext - Preserved state for:', viewKey, state);
  };

  // Função para limpar estado preservado de uma tela
  const clearPreservedState = (viewKey: string) => {
    setPreservedStates(prev => {
      const newStates = { ...prev };
      delete newStates[viewKey];
      return newStates;
    });
    console.log('🗑️ AppContext - Cleared preserved state for:', viewKey);
  };

  const handleSetCurrentView = (view: AppView) => {
    console.log('🔄 AppContext - Setting view to:', view);
    // Evitar loop infinito - não chamar goToView aqui
    setCurrentView(view);
    setSubView('none');
    console.log('✅ AppContext - View set to:', view);
  };

  const handleSetSubView = (subView: SubView) => {
    console.log('🔄 AppContext - Setting subView to:', subView);
    setSubView(subView);
    console.log('✅ AppContext - SubView set to:', subView);
  };

  const handleSetViewParams = (params: { profileId?: string; profileName?: string; contactNumber?: string }) => {
    setViewParams(params);
  };

  // Verificar se pode voltar
  const canGoBack = navigationHistory.length > 1;

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView: handleSetCurrentView,
        subView,
        setSubView: handleSetSubView,
        viewParams,
        setViewParams: handleSetViewParams,
        
        // Sistema de navegação inteligente
        navigationHistory,
        canGoBack,
        goBack,
        goToView,
        
        // Sistema de preservação de estado
        getPreservedState,
        setPreservedState,
        clearPreservedState,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}; 