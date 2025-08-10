import React from 'react';

interface SyncIndicatorProps {
  isChecking: boolean;
  needsSync: boolean;
  syncReason: string | null;
  lastCheckTime: number;
  onManualSync?: () => void;
  onForceCheck?: () => void;
  className?: string;
}

export default function SyncIndicator({
  isChecking,
  needsSync,
  syncReason,
  lastCheckTime,
  onManualSync,
  onForceCheck,
  className = ''
}: SyncIndicatorProps) {
  const getSyncStatusText = () => {
    if (isChecking) return 'Verificando sincronização...';
    if (needsSync) {
      switch (syncReason) {
        case 'message_count_mismatch':
          return 'Número de mensagens diferente';
        case 'last_message_id_mismatch':
          return 'Última mensagem diferente';
        case 'timestamp_mismatch':
          return 'Timestamps diferentes';
        case 'error_checking_sync':
          return 'Erro ao verificar';
        case 'frontend_detected_mismatch':
          return 'Preview desatualizado';
        case 'preview_mismatch':
          return 'Preview desatualizado';
        default:
          return 'Sincronização necessária';
      }
    }
    return 'Sincronizado';
  };

  const getSyncStatusIcon = () => {
    if (isChecking) return '🔄';
    if (needsSync) return '⚠️';
    return '✅';
  };

  const getSyncStatusColor = () => {
    if (isChecking) return 'text-blue-500';
    if (needsSync) return 'text-orange-500';
    return 'text-green-500';
  };

  const formatLastCheck = () => {
    if (lastCheckTime === 0) return 'Nunca';
    
    const now = Date.now();
    const diff = now - lastCheckTime;
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s atrás`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m atrás`;
    return `${Math.floor(seconds / 3600)}h atrás`;
  };

  return (
    <div className={`sync-indicator ${className}`}>
      <div className="flex items-center gap-2 text-sm">
        <span className={`text-lg ${getSyncStatusColor()}`}>
          {getSyncStatusIcon()}
        </span>
        
        <div className="flex flex-col">
          <span className={`font-medium ${getSyncStatusColor()}`}>
            {getSyncStatusText()}
          </span>
          
          {lastCheckTime > 0 && (
            <span className="text-xs text-gray-500">
              Última verificação: {formatLastCheck()}
            </span>
          )}
        </div>

        <div className="flex gap-1 ml-auto">
          {onForceCheck && (
            <button
              onClick={onForceCheck}
              disabled={isChecking}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Verificar agora"
            >
              🔍
            </button>
          )}
          
          {needsSync && onManualSync && (
            <button
              onClick={onManualSync}
              disabled={isChecking}
              className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sincronizar agora"
            >
              🔄
            </button>
          )}
        </div>
      </div>

      {/* Tooltip com detalhes quando há problema de sincronização */}
      {needsSync && syncReason && (
        <div className="mt-1 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
          <strong>Problema detectado:</strong> {getSyncStatusText()}
          {onManualSync && (
            <button
              onClick={onManualSync}
              className="ml-2 underline hover:no-underline"
            >
              Corrigir agora
            </button>
          )}
        </div>
      )}
    </div>
  );
} 