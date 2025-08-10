'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import SharedWhatsAppViewComponent from './SharedWhatsAppViewComponent';
import { SharedAppProvider } from '../../../contexts/SharedAppContext';

interface SharedProfile {
  id: number;
  name: string;
  isConnected: boolean;
  shareUrl: string;
}

export default function SharedWhatsAppPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [profile, setProfile] = useState<SharedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/whatsapp/shared/${token}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Perfil não encontrado');
          } else if (response.status === 403) {
            setError('Compartilhamento desabilitado');
          } else {
            setError('Erro ao carregar perfil');
          }
          return;
        }

        const data = await response.json();
        if (data.success && data.profile) {
          setProfile(data.profile);
        } else {
          setError('Dados do perfil inválidos');
        }
      } catch (err) {
        console.error('Erro ao buscar perfil:', err);
        setError('Erro de conexão');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchProfile();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando WhatsApp compartilhado...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-2xl text-red-600"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Erro</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="bg-white rounded-lg p-4 shadow-sm max-w-md mx-auto">
            <p className="text-sm text-gray-600">
              {error === 'Perfil não encontrado' && 'Este link de compartilhamento não existe ou foi removido.'}
              {error === 'Compartilhamento desabilitado' && 'O compartilhamento deste perfil foi desabilitado pelo administrador.'}
              {error === 'Erro ao carregar perfil' && 'Ocorreu um erro ao carregar o perfil.'}
              {error === 'Erro de conexão' && 'Erro de conexão com o servidor.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-question-circle text-2xl text-yellow-600"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Perfil não disponível</h2>
          <p className="text-gray-600">Não foi possível carregar o perfil compartilhado.</p>
        </div>
      </div>
    );
  }

  return (
    <SharedAppProvider profileId={profile.id.toString()}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">{profile.name}</h1>
                <p className="text-sm text-gray-500">
                  {profile.isConnected ? 'Conectado' : 'Desconectado'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <i className="fas fa-share-alt mr-1"></i>
                Compartilhado
              </span>
            </div>
          </div>
        </div>

        {/* Shared WhatsApp View Component */}
        <div className="h-[calc(100vh-80px)]">
          <SharedWhatsAppViewComponent 
            profileId={profile.id.toString()}
            profileName={profile.name}
            isShared={true}
          />
        </div>
      </div>
    </SharedAppProvider>
  );
} 