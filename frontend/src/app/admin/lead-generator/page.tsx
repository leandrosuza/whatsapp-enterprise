'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../../../contexts/AppContext';
import './lead-generator.css';

interface Profile {
  id: string;
  numericId?: number; // ID numérico para ordenação
  name: string;
  number: string;
  photo: string | null;
  status: string;
  lastSeen: string;
  statusMessage: string;
  hasWhatsApp: boolean;
  hasPhoto: boolean;
  hasStatus: boolean;
  hasName: boolean;
  isConnected?: boolean; // Para compatibilidade com perfis WhatsApp
}

interface DDD {
  id: number;
  ddd: string;
  state: string;
  stateCode: string;
  region: string;
  regionCode: string;
  cities: string[];
  description?: string;
}

interface Region {
  region: string;
  regionCode: string;
  dddCount: number;
}

interface State {
  state: string;
  stateCode: string;
  region: string;
  regionCode: string;
  dddCount: number;
}

export default function ContactsExplorerPage() {
  const { setCurrentView, setSubView, setViewParams } = useApp();
  const [selectedCountry, setSelectedCountry] = useState('Brasil (+55)');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDDD, setSelectedDDD] = useState('');
  const [prefix, setPrefix] = useState('9971');
  const [rangeFrom, setRangeFrom] = useState(0);
  const [rangeTo, setRangeTo] = useState(1000);
  
  // Dados do banco
  const [regions, setRegions] = useState<Region[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [ddds, setDdds] = useState<DDD[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [onlyWithPhoto, setOnlyWithPhoto] = useState(true);
  const [onlyWithStatus, setOnlyWithStatus] = useState(false);
  const [onlyWithName, setOnlyWithName] = useState(false);
  const [onlyWithoutPhoto, setOnlyWithoutPhoto] = useState(false);
  
  // Estados de controle
  const [isSearching, setIsSearching] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [searchProgress, setSearchProgress] = useState(45);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'error' | 'success' | 'warning'>('error');
  
  // Perfis encontrados durante a busca (para o carrossel)
  const [foundProfiles, setFoundProfiles] = useState<Profile[]>([]);
  
  // Estados para o modal de seleção de perfil
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedContactForMessage, setSelectedContactForMessage] = useState<Profile | null>(null);
  const [whatsappProfiles, setWhatsappProfiles] = useState<any[]>([]);
  const [selectedWhatsappProfile, setSelectedWhatsappProfile] = useState<any>(null);
  


  // Carregar dados do banco
  useEffect(() => {
    loadDDDData();
  }, []);

  // Monitorar mudanças no estado foundProfiles
  useEffect(() => {
    console.log(`🔄 Estado foundProfiles mudou: ${foundProfiles.length} perfis`);
    // Forçar re-renderização se necessário
    if (foundProfiles.length > 0) {
      console.log(`🎯 Forçando re-renderização do carrossel com ${foundProfiles.length} perfis`);
    }
  }, [foundProfiles]);

  // Carregar estados quando região mudar
  useEffect(() => {
    if (selectedRegion) {
      loadStates();
    }
  }, [selectedRegion]);

  // Carregar cidades quando estado mudar
  useEffect(() => {
    if (selectedState) {
      loadCities();
    }
  }, [selectedState]);

  const loadDDDData = async () => {
    try {
      setLoading(true);
      
      // Carregar regiões
      const regionsResponse = await fetch('/api/ddds/regions');
      const regionsData = await regionsResponse.json();
      if (regionsData.success) {
        setRegions(regionsData.data);
      }
      
      // Carregar todos os DDDs
      const dddsResponse = await fetch('/api/ddds');
      const dddsData = await dddsResponse.json();
      if (dddsData.success) {
        setDdds(dddsData.data);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Erro ao carregar dados dos DDDs:', error);
      setLoading(false);
    }
  };



  const loadStates = async () => {
    try {
      const response = await fetch(`/api/ddds/states?region=${encodeURIComponent(selectedRegion)}`);
      const data = await response.json();
      if (data.success) {
        setStates(data.data);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar estados:', error);
    }
  };

  const loadCities = async () => {
    try {
      // Filtrar cidades dos DDDs baseado no estado selecionado
      if (selectedState && ddds.length > 0) {
        const stateDDDs = ddds.filter(ddd => ddd.state === selectedState);
        const allCities = stateDDDs.flatMap(ddd => ddd.cities || []);
        const uniqueCities = [...new Set(allCities)].sort();
        setCities(uniqueCities);
      } else {
        setCities([]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar cidades:', error);
    }
  };

  const loadWhatsAppProfiles = async () => {
    try {
      const response = await fetch('/api/whatsapp/profiles');
      const data = await response.json();
      const profiles = Array.isArray(data) ? data : (data.profiles || []);
      setWhatsappProfiles(profiles);
      console.log('📱 Perfis WhatsApp carregados para modal:', profiles);
    } catch (error) {
      console.error('❌ Erro ao carregar perfis WhatsApp:', error);
      showNotificationToast('❌ Erro ao carregar perfis WhatsApp', 'error');
    }
  };

  useEffect(() => {
    console.log('🔄 Contacts Explorer Page Loaded Successfully');
  }, []);



  const showNotificationToast = (message: string, type: 'error' | 'success' | 'warning' = 'error') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    
    // Auto-hide após 5 segundos
    setTimeout(() => {
      setShowNotification(false);
    }, 5000);
  };

  // Gerar números de telefone baseados nos filtros selecionados
  const generatePhoneNumbers = (): string[] => {
    const numbers: string[] = [];
    
    // Se um DDD específico foi selecionado, usar apenas ele
    const dddToUse = selectedDDD || '18'; // DDD padrão se nenhum selecionado
    
    // Gerar números no range especificado
    for (let i = rangeFrom; i <= rangeTo; i++) {
      // Formatar o número com zeros à esquerda
      const suffix = i.toString().padStart(4, '0');
      const fullNumber = `55${dddToUse}${prefix}${suffix}`;
      numbers.push(fullNumber);
    }
    
    console.log('📱 Números gerados:', {
      ddd: dddToUse,
      prefix,
      rangeFrom,
      rangeTo,
      total: numbers.length
    });
    
    return numbers;
  };

  const startSearch = async () => {
    try {
      // Buscar perfis WhatsApp reais do backend
      const whatsappProfilesResponse = await fetch('/api/whatsapp/profiles');
      if (!whatsappProfilesResponse.ok) {
        showNotificationToast('❌ Erro ao carregar perfis WhatsApp. Tente novamente.', 'error');
        return;
      }

      const whatsappProfilesData = await whatsappProfilesResponse.json();
      const whatsappProfiles = Array.isArray(whatsappProfilesData) ? whatsappProfilesData : (whatsappProfilesData.profiles || []);
      
      // Filtrar apenas perfis conectados
      const connectedProfiles = whatsappProfiles.filter((profile: any) => 
        profile.isConnected && profile.status === 'connected'
      );

      if (connectedProfiles.length === 0) {
        showNotificationToast('⚠️ Nenhum perfil WhatsApp conectado encontrado! Por favor, conecte pelo menos um perfil WhatsApp antes de iniciar a busca.', 'warning');
        return;
      }

      // Usar o primeiro perfil conectado disponível
      const activeProfile = connectedProfiles[0];
      console.log('✅ Usando perfil ativo para busca:', activeProfile.name, '(ID:', activeProfile.id, ')');

      // Gerar números de telefone baseados nos filtros
      const phoneNumbers = generatePhoneNumbers();
      
      if (phoneNumbers.length === 0) {
        showNotificationToast('⚠️ Nenhum número de telefone foi gerado com os filtros atuais. Ajuste os filtros e tente novamente.', 'warning');
        return;
      }

      console.log('🔍 Iniciando busca de contatos:', {
        profileId: activeProfile.id,
        profileName: activeProfile.name,
        totalNumbers: phoneNumbers.length,
        filters: {
          ddd: selectedDDD,
          prefix,
          rangeFrom,
          rangeTo
        }
      });

      setIsSearching(true);
      setIsPaused(false);
      setSearchProgress(0);
      setFoundProfiles([]); // Limpar carrossel no início da busca

      // Dividir os números em lotes para não sobrecarregar
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < phoneNumbers.length; i += batchSize) {
        batches.push(phoneNumbers.slice(i, i + batchSize));
      }

      let foundContacts = [];
      let processedCount = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        // Verificar se a busca foi pausada
        while (isPaused && isSearching) {
          console.log('⏸️ Busca pausada, aguardando...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Verificar se a busca foi interrompida
        if (!isSearching) {
          console.log('⏹️ Busca interrompida pelo usuário');
          break;
        }
        
        try {
          console.log(`🔍 Processando lote ${i + 1}/${batches.length} com ${batch.length} números`);
          
          const response = await fetch(`/api/whatsapp/profiles/${activeProfile.id}/check-contacts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phoneNumbers: batch }),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          
          console.log(`🔍 Dados do lote ${i + 1}:`, data);
          
          if (data.success && data.results) {
            console.log(`📊 Resultados do lote ${i + 1}:`, {
              total: data.results.length,
              registered: data.results.filter(contact => contact.isRegistered).length,
              notRegistered: data.results.filter(contact => !contact.isRegistered).length
            });
            
            const validContacts = data.results.filter(contact => contact.isRegistered);
            foundContacts = [...foundContacts, ...validContacts];
            
            console.log(`👥 Contatos válidos do lote ${i + 1}:`, validContacts.map(c => ({ name: c.name, phone: c.phoneNumber })));
            
            // Converter os contatos encontrados para o formato da interface
            const newProfiles = validContacts.map((contact, contactIndex) => ({
              id: `found-${Date.now()}-${i}-${contactIndex}`,
              numericId: Date.now() + i * 1000 + contactIndex, // ID numérico para ordenação
              name: contact.name || `Contato ${contact.phoneNumber}`,
              number: contact.phoneNumber,
              photo: contact.photo,
              status: contact.status || 'Disponível',
              lastSeen: 'Agora',
              statusMessage: contact.status || 'Contato encontrado via busca',
              hasWhatsApp: true,
              hasPhoto: !!contact.photo,
              hasStatus: !!contact.status,
              hasName: !!contact.name
            }));

            // Atualizar o carrossel em tempo real (mais recentes primeiro por ID numérico)
            setFoundProfiles(prevProfiles => {
              // Atribuir numericId a perfis antigos que não têm
              const profilesWithNumericId = prevProfiles.map((profile, index) => ({
                ...profile,
                numericId: profile.numericId || (Date.now() - (index + 1) * 1000) // IDs decrescentes para perfis antigos
              }));
              
              const allProfiles = [...newProfiles, ...profilesWithNumericId];
              // Ordenar por numericId decrescente (mais recentes primeiro)
              const sortedProfiles = allProfiles.sort((a, b) => {
                const idA = a.numericId || 0;
                const idB = b.numericId || 0;
                return idB - idA; // Decrescente: 11, 10, 9, 8...
              });
              console.log(`🎯 Carrossel atualizado: ${sortedProfiles.length} perfis no total`, sortedProfiles.map(p => ({ id: p.id, numericId: p.numericId, name: p.name })));
              console.log(`📊 Ordem dos IDs numéricos:`, sortedProfiles.map(p => p.numericId).slice(0, 5)); // Mostra os 5 primeiros IDs
              return sortedProfiles;
            });
            
            console.log(`✅ Lote ${i + 1} processado: ${validContacts.length} contatos encontrados`);
          }

          processedCount += batch.length;
          const progress = Math.round((processedCount / phoneNumbers.length) * 100);
          setSearchProgress(progress);

          // Pequena pausa entre lotes
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`❌ Erro ao processar lote ${i + 1}:`, error);
          showNotificationToast(`❌ Erro ao processar lote ${i + 1}. Continuando...`, 'error');
          
          // Continuar com o próximo lote mesmo se houver erro
          processedCount += batch.length;
          const progress = Math.round((processedCount / phoneNumbers.length) * 100);
          setSearchProgress(progress);
        }
      }



      console.log('✅ Busca concluída:', {
        totalProcessed: processedCount,
        found: foundContacts.length,
        totalProfilesInCarousel: foundProfiles.length
      });

      showNotificationToast(`✅ Busca concluída! ${foundContacts.length} perfis encontrados de ${processedCount} números verificados.`, 'success');

    } catch (error) {
      console.error('❌ Erro durante a busca:', error);
      showNotificationToast('❌ Erro durante a busca. Tente novamente.', 'error');
    } finally {
      setIsSearching(false);
      setIsPaused(false);
      setSearchProgress(0);
    }
  };

  const stopSearch = () => {
    setIsSearching(false);
    setIsPaused(false);
    setSearchProgress(0);
    showNotificationToast('⏹️ Busca interrompida pelo usuário.', 'warning');
  };

  const pauseSearch = () => {
    if (isSearching) {
      setIsPaused(true);
      showNotificationToast('⏸️ Busca pausada. Clique em "Resume" para continuar.', 'warning');
    }
  };

  const resumeSearch = () => {
    if (isPaused) {
      setIsPaused(false);
      showNotificationToast('▶️ Busca retomada.', 'success');
    }
  };

  const handleProfileClick = (profile: Profile) => {
    setSelectedProfile(profile);
  };

  const handleMessageClick = (contact: Profile) => {
    setSelectedContactForMessage(contact);
    setSelectedWhatsappProfile(null);
    loadWhatsAppProfiles();
    setShowProfileModal(true);
  };

  const handleProfileSelection = (profile: any) => {
    setSelectedWhatsappProfile(profile);
  };

  const handleContinueToChat = () => {
    if (!selectedWhatsappProfile || !selectedContactForMessage) {
      showNotificationToast('❌ Selecione um perfil WhatsApp para continuar', 'error');
      return;
    }

    // Configurar o contexto para abrir WhatsApp view como subView
    setCurrentView('dashboard');
    setSubView('whatsapp-view');
    setViewParams({
      profileId: selectedWhatsappProfile.id.toString(),
      profileName: selectedWhatsappProfile.name || 'WhatsApp Profile',
      contactNumber: selectedContactForMessage.number
    });
    
    // Fechar modal
    setShowProfileModal(false);
    setSelectedContactForMessage(null);
    setSelectedWhatsappProfile(null);
    
    console.log('✅ WhatsApp view aberto no conteúdo filho:', {
      profileId: selectedWhatsappProfile.id,
      profileName: selectedWhatsappProfile.name,
      contactNumber: selectedContactForMessage.number
    });
  };

  const handleCancelModal = () => {
    setShowProfileModal(false);
    setSelectedContactForMessage(null);
    setSelectedWhatsappProfile(null);
  };

  const handleCarouselScroll = (direction: 'left' | 'right') => {
    const carousel = document.getElementById('resultsCarousel');
    if (carousel) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Estatísticas
  const stats = {
    found: foundProfiles.length,
    withPhoto: foundProfiles.filter(p => p.hasPhoto).length,
    withoutPhoto: foundProfiles.filter(p => !p.hasPhoto).length,
    withStatus: foundProfiles.filter(p => p.hasStatus).length,
    withName: foundProfiles.filter(p => p.hasName).length
  };

  const getGradientClass = (index: number) => {
    const gradients = [
      'from-blue-400 to-indigo-500',
      'from-purple-400 to-pink-500',
      'from-yellow-400 to-orange-500',
      'from-green-400 to-teal-500',
      'from-red-400 to-pink-500',
      'from-indigo-400 to-purple-500',
      'from-pink-400 to-red-500',
      'from-teal-400 to-green-500'
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className={`lead-generator-bg ${
      isSearching && !isPaused ? 'searching-active' : 
      isPaused ? 'searching-paused' : 
      'searching-inactive'
    }`}>
      {/* Notification Toast */}
      {showNotification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-l-4 transition-all duration-300 ${
          notificationType === 'error' ? 'bg-red-50 border-red-400 text-red-700' :
          notificationType === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-700' :
          'bg-green-50 border-green-400 text-green-700'
        }`}>
          <div className="flex items-center">
            <i className={`fas ${
              notificationType === 'error' ? 'fa-exclamation-circle' :
              notificationType === 'warning' ? 'fa-exclamation-triangle' :
              'fa-check-circle'
            } mr-3`}></i>
            <div className="flex-1">
              <p className="font-medium">{notificationMessage}</p>
            </div>
            <button 
              onClick={() => setShowNotification(false)}
              className="ml-3 text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}
      
      <div className="main-container">
        {/* Lateral Navbar - Flat style, attached to main sidebar */}
        <div className="lateral-navbar">
          <div className="navbar-header">
            <h2>
              <div className="icon">
                <i className="fas fa-cog text-white text-sm"></i>
              </div>
              Configurações
            </h2>
          </div>
          
          <div className="navbar-content">

            {/* Country Selection */}
            <div className="form-section">
              <h3>
                <i className="fas fa-globe"></i>
                País
              </h3>
              <div className="form-control">
                <label>
                  <i className="fas fa-globe"></i>
                  Country
                </label>
                <select 
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="focus-ring"
                >
                  <option>Brasil (+55)</option>
                  <option>Argentina (+54)</option>
                  <option>México (+52)</option>
                  <option>Colômbia (+57)</option>
                </select>
              </div>
            </div>
            
            {/* Region Selection */}
            <div className="form-section">
              <h3>
                <i className="fas fa-map"></i>
                Região
              </h3>
              <div className="form-control">
                <label>
                  <i className="fas fa-map"></i>
                  Region
                </label>
                <select 
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="focus-ring"
                >
                  <option value="">Select a region</option>
                  {regions.map(region => (
                    <option key={region.region} value={region.region}>
                      {region.region} ({region.dddCount} DDDs)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* State Selection */}
            <div className="form-section">
              <h3>
                <i className="fas fa-city"></i>
                Estado
              </h3>
              <div className="form-control">
                <label>
                  <i className="fas fa-city"></i>
                  State
                </label>
                <select 
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  disabled={!selectedRegion}
                  className="focus-ring"
                >
                  <option value="">Select a state</option>
                  {states.map(state => (
                    <option key={state.state} value={state.state}>
                      {state.state} ({state.dddCount} DDDs)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* City Selection */}
            <div className="form-section">
              <h3>
                <i className="fas fa-building"></i>
                Cidade
              </h3>
              <div className="form-control">
                <label>
                  <i className="fas fa-building"></i>
                  City
                </label>
                <select 
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  disabled={!selectedState}
                  className="focus-ring"
                >
                  <option value="">Select a city</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* DDD Selection */}
            <div className="form-section">
              <h3>
                <i className="fas fa-phone"></i>
                DDD
              </h3>
              <div className="form-control">
                <label>
                  <i className="fas fa-phone"></i>
                  DDD
                </label>
                <select 
                  value={selectedDDD}
                  onChange={(e) => setSelectedDDD(e.target.value)}
                  className="focus-ring"
                >
                  <option value="">Select a DDD</option>
                  {ddds
                    .filter(ddd => {
                      if (selectedRegion && ddd.region !== selectedRegion) return false;
                      if (selectedState && ddd.state !== selectedState) return false;
                      return true;
                    })
                    .map(ddd => (
                      <option key={ddd.id} value={ddd.ddd}>
                        {ddd.ddd} - {ddd.state} ({ddd.cities.length} cities)
                      </option>
                    ))}
                </select>
              </div>
            </div>
            
            {/* Prefix Range */}
            <div className="form-section">
              <h3>
                <i className="fas fa-hashtag"></i>
                Prefixo
              </h3>
              <div className="form-control">
                <label>
                  <i className="fas fa-hashtag"></i>
                  Prefix
                </label>
                <input 
                  type="text" 
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="focus-ring"
                  placeholder="Ex: 9971"
                />
                <p className="text-xs text-gray-500 italic mt-1">First 4 digits of the number</p>
              </div>
            </div>
            
            {/* Number Range */}
            <div className="form-section">
              <h3>
                <i className="fas fa-sort-numeric-up"></i>
                Intervalo
              </h3>
              <div className="form-control">
                <label>
                  <i className="fas fa-sort-numeric-up"></i>
                  Range
                </label>
                <div className="range-inputs">
                  <input 
                    type="number" 
                    placeholder="From" 
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(parseInt(e.target.value) || 0)}
                    className="focus-ring"
                  />
                  <input 
                    type="number" 
                    placeholder="To" 
                    value={rangeTo}
                    onChange={(e) => setRangeTo(parseInt(e.target.value) || 1000)}
                    className="focus-ring"
                  />
                </div>
              </div>
            </div>
            
            {/* Filters */}
            <div className="form-section">
              <h3>
                <i className="fas fa-filter"></i>
                Filtros
              </h3>
              <div className="filters-section">
                <div className="filter-item">
                  <input 
                    type="checkbox" 
                    checked={onlyWithPhoto}
                    onChange={(e) => {
                      setOnlyWithPhoto(e.target.checked);
                      if (e.target.checked) setOnlyWithoutPhoto(false);
                    }}
                  />
                  <span>Only numbers with photo</span>
                </div>
                <div className="filter-item">
                  <input 
                    type="checkbox" 
                    checked={onlyWithStatus}
                    onChange={(e) => setOnlyWithStatus(e.target.checked)}
                  />
                  <span>Only numbers with status</span>
                </div>
                <div className="filter-item">
                  <input 
                    type="checkbox" 
                    checked={onlyWithName}
                    onChange={(e) => setOnlyWithName(e.target.checked)}
                  />
                  <span>Only numbers with name</span>
                </div>
                <div className="filter-item">
                  <input 
                    type="checkbox" 
                    checked={onlyWithoutPhoto}
                    onChange={(e) => {
                      setOnlyWithoutPhoto(e.target.checked);
                      if (e.target.checked) setOnlyWithPhoto(false);
                    }}
                  />
                  <span>Only numbers without photo</span>
                </div>
              </div>
            </div>
            
            {/* Action Button */}
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Status Bar */}
          <div className="status-bar">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-lg flex items-center mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-3"></div>
                  Active Search
                </h3>
                <p className="text-sm text-gray-600 font-medium">
                  Verificando: <span className="font-mono text-blue-600">+55 {selectedDDD || 'XX'} {prefix}0-{rangeFrom.toString().padStart(4, '0')}</span> a <span className="font-mono text-blue-600">+55 {selectedDDD || 'XX'} {prefix}0-{rangeTo.toString().padStart(4, '0')}</span>
                </p>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{stats.found}</p>
                  <p className="text-xs text-gray-500 font-medium">Found</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{stats.withPhoto}</p>
                  <p className="text-xs text-gray-500 font-medium">With photo</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-500">{stats.withoutPhoto}</p>
                  <p className="text-xs text-gray-500 font-medium">Without photo</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">{stats.withStatus}</p>
                  <p className="text-xs text-gray-500 font-medium">With status</p>
                </div>
                
                {/* Controles de Busca Organizados */}
                <div className="flex items-center gap-3">
                  {/* Botão Start */}
                  <button 
                    onClick={startSearch}
                    disabled={isSearching || loading}
                    className={`font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                      isSearching || loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                    }`}
                  >
                    {isSearching ? (
                      <>
                        <div className="loading-spinner"></div>
                        <span className="hidden sm:inline">Searching...</span>
                      </>
                    ) : loading ? (
                      <>
                        <div className="loading-spinner"></div>
                        <span className="hidden sm:inline">Loading...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-play text-sm"></i>
                        <span className="hidden sm:inline">Start</span>
                      </>
                    )}
                  </button>

                  {/* Botão Pause/Resume */}
                  {isSearching && (
                    <button 
                      onClick={isPaused ? resumeSearch : pauseSearch}
                      className={`font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                        isPaused
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white'
                          : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white'
                      }`}
                    >
                      <i className={`text-sm ${isPaused ? 'fas fa-play' : 'fas fa-pause'}`}></i>
                      <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
                    </button>
                  )}

                  {/* Botão Stop */}
                  {(isSearching || isPaused) && (
                    <button 
                      onClick={stopSearch}
                      className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <i className="fas fa-stop text-sm"></i>
                      <span className="hidden sm:inline">Stop</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="progress-container">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>
                  {isPaused ? '⏸️ Pausado' : isSearching ? '🔍 Buscando...' : 'Progress'}
                </span>
                <span>{searchProgress}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className={`progress-fill ${isPaused ? 'animate-pulse' : ''}`}
                  style={{ 
                    width: `${searchProgress}%`,
                    backgroundColor: isPaused ? '#f59e0b' : undefined
                  }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Results Section */}
          <div className="results-section">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center">
                <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center mr-2">
                  <i className="fas fa-users text-white text-xs"></i>
                </div>
                Results
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <i className="fas fa-info-circle text-blue-500"></i>
                <span>{foundProfiles.length} profiles found</span>
              </div>
            </div>
            
            <div className="profile-cards-container">
              <div className="relative" style={{ minHeight: '400px' }}>
                <div 
                  key={`carousel-${foundProfiles.length}`}
                  id="resultsCarousel"
                  className="flex overflow-x-auto pb-6 gap-6 custom-scrollbar"
                  style={{ scrollBehavior: 'smooth', minHeight: '350px' }}
                >
                {(() => {
                  console.log(`🎨 Renderizando carrossel: ${foundProfiles.length} perfis`, foundProfiles.map(p => ({ id: p.id, name: p.name })));
                  return foundProfiles.length === 0 ? (
                  <div className="flex-shrink-0 w-full flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <i className="fas fa-search text-4xl mb-4"></i>
                      <p className="text-lg font-medium">Nenhum perfil encontrado ainda</p>
                      <p className="text-sm">Clique em "Start" para começar a explorar contatos</p>
                    </div>
                  </div>
                ) : (
                  foundProfiles.map((profile, index) => (
                  <div 
                    key={profile.id}
                    onClick={() => handleProfileClick(profile)}
                    className={`profile-card flex-shrink-0 w-72 bg-white rounded-2xl overflow-hidden shadow-lg cursor-pointer transition-all duration-500 border-2 ${
                      selectedProfile?.id === profile.id 
                        ? 'border-blue-500 scale-105 shadow-2xl' 
                        : 'border-transparent hover:border-blue-200 scale-100 hover:scale-105'
                    }`}
                  >
                    <div className={`relative h-48 bg-gradient-to-br ${getGradientClass(index)}`}>
                      <div className="absolute inset-0 bg-black/10"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        {profile.photo ? (
                          <img 
                            src={profile.photo} 
                            alt="Profile" 
                            className="h-28 w-28 rounded-full border-4 border-white/90 object-cover shadow-xl"
                          />
                        ) : (
                          <div className="h-28 w-28 rounded-full border-4 border-white/90 bg-white/20 backdrop-blur-sm flex items-center justify-center text-white/80 shadow-xl">
                            <i className="fas fa-user text-4xl"></i>
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center justify-center">
                          <i className="fas fa-check-circle text-green-600 mr-2 text-sm"></i>
                          <span className="text-xs font-semibold text-gray-700">Valid WhatsApp</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 text-center">
                      <h3 className="font-bold text-gray-800 text-lg mb-1">{profile.name}</h3>
                      <p className="text-sm text-gray-600 font-mono mb-4">{profile.number}</p>
                      
                      <div className="flex justify-center space-x-2 mb-4">
                        <button 
                          onClick={() => handleMessageClick(profile)}
                          className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-2 px-4 rounded-full flex items-center gap-1 transition-all duration-200 transform hover:scale-105 shadow-md"
                        >
                          <i className="fas fa-comment text-xs"></i>
                          <span>Message</span>
                        </button>
                        <button className="text-xs bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white py-2 px-4 rounded-full flex items-center gap-1 transition-all duration-200 transform hover:scale-105 shadow-md">
                          <i className="fas fa-save text-xs"></i>
                          <span>Salvar</span>
                        </button>
                      </div>
                      
                      {/* Status Indicators */}
                      <div className="flex justify-center space-x-2">
                        {profile.hasPhoto && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <i className="fas fa-image mr-1"></i>
                            Foto
                          </span>
                        )}
                        {profile.hasStatus && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <i className="fas fa-comment-dots mr-1"></i>
                            Status
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
                );
                })()}
              </div>
              
              {/* Carousel Navigation */}
              <button 
                onClick={() => handleCarouselScroll('left')}
                className="carousel-nav left"
              >
                <i className="fas fa-chevron-left text-lg"></i>
              </button>
              <button 
                onClick={() => handleCarouselScroll('right')}
                className="carousel-nav right"
              >
                <i className="fas fa-chevron-right text-lg"></i>
              </button>
            </div>
            
            {/* Selected Profile Details */}
            {selectedProfile && (
              <div className="profile-details">
                <h3 className="font-bold text-gray-800 text-base mb-4 flex items-center">
                  <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center mr-2">
                    <i className="fas fa-user-circle text-white text-xs"></i>
                  </div>
                  Detalhes do Perfil
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</p>
                      <p className="font-bold text-gray-800 text-base">{selectedProfile.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Número</p>
                      <p className="font-mono font-bold text-blue-600 text-base">{selectedProfile.number}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</p>
                      <p className="font-medium text-gray-800 text-sm">{selectedProfile.status}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Última vez visto</p>
                      <p className="font-medium text-gray-800 text-sm">{selectedProfile.lastSeen}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mensagem de status</p>
                      <p className="font-medium text-gray-800 text-sm italic">
                        {selectedProfile.statusMessage || 'Nenhuma mensagem de status'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm">
                    <i className="fas fa-comment-dots text-xs"></i>
                    Enviar Mensagem
                  </button>
                  <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm">
                    <i className="fas fa-save text-xs"></i>
                    Salvar Contato
                  </button>
                  <button className="bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm">
                    <i className="fas fa-ban text-xs"></i>
                    Ignorar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Modal de Seleção de Perfil WhatsApp */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 text-white p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20"></div>
              <div className="relative z-10">
              <h2 className="text-xl font-bold flex items-center">
                <i className="fas fa-user-circle mr-3"></i>
                Selecione um perfil:
              </h2>
              {selectedContactForMessage && (
                <p className="text-green-100 text-sm mt-2">
                  Enviar mensagem para: <span className="font-semibold">{selectedContactForMessage.name}</span>
                </p>
              )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {whatsappProfiles.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <i className="fas fa-spinner fa-spin text-2xl mb-4"></i>
                  <p>Carregando perfis...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {whatsappProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      onClick={() => handleProfileSelection(profile)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        selectedWhatsappProfile?.id === profile.id
                          ? 'border-green-500 bg-green-50 scale-105 shadow-lg shadow-green-200'
                          : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          {profile.profilePhoto ? (
                            <img
                              src={profile.profilePhoto}
                              alt={profile.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                              <i className="fas fa-user text-gray-500"></i>
                            </div>
                          )}
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                            profile.isConnected ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{profile.name}</h3>
                          <p className="text-sm text-gray-600">{profile.phoneNumber}</p>
                          <div className="flex items-center mt-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              profile.isConnected 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              <i className={`fas fa-circle text-xs mr-1 ${
                                profile.isConnected ? 'text-green-500' : 'text-red-500'
                              }`}></i>
                              {profile.isConnected ? 'Conectado' : 'Desconectado'}
                            </span>
                          </div>
                        </div>
                        {selectedWhatsappProfile?.id === profile.id && (
                          <div className="text-green-500">
                            <i className="fas fa-check-circle text-xl"></i>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={handleCancelModal}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleContinueToChat}
                disabled={!selectedWhatsappProfile}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  selectedWhatsappProfile
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transform hover:scale-105'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <i className="fas fa-comment text-sm"></i>
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 