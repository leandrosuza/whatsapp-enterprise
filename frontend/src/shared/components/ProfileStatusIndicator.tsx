import React from 'react';

interface ProfileStatusIndicatorProps {
  status: 'connected' | 'disconnected' | 'error' | 'unknown';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProfileStatusIndicator: React.FC<ProfileStatusIndicatorProps> = ({
  status,
  showLabel = false,
  size = 'md',
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'bg-green-400',
          icon: 'fas fa-check-circle',
          label: 'Connected',
          textColor: 'text-green-600'
        };
      case 'disconnected':
        return {
          color: 'bg-orange-400',
          icon: 'fas fa-wifi-slash',
          label: 'Disconnected',
          textColor: 'text-orange-600'
        };
      case 'error':
        return {
          color: 'bg-red-400',
          icon: 'fas fa-exclamation-triangle',
          label: 'Error',
          textColor: 'text-red-600'
        };
      default:
        return {
          color: 'bg-gray-400',
          icon: 'fas fa-question-circle',
          label: 'Unknown',
          textColor: 'text-gray-600'
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          dot: 'w-2 h-2',
          icon: 'text-xs',
          label: 'text-xs'
        };
      case 'lg':
        return {
          dot: 'w-4 h-4',
          icon: 'text-lg',
          label: 'text-sm'
        };
      default:
        return {
          dot: 'w-3 h-3',
          icon: 'text-sm',
          label: 'text-sm'
        };
    }
  };

  const config = getStatusConfig();
  const sizeClasses = getSizeClasses();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div 
        className={`${config.color} ${sizeClasses.dot} rounded-full`}
        title={config.label}
      />
      {showLabel && (
        <span className={`${config.textColor} ${sizeClasses.label} font-medium`}>
          {config.label}
        </span>
      )}
    </div>
  );
};

export default ProfileStatusIndicator; 