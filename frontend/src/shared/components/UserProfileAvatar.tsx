import React, { useState, useEffect } from 'react';

interface UserProfileAvatarProps {
  profilePhoto?: string;
  name: string;
  isConnected: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const UserProfileAvatar: React.FC<UserProfileAvatarProps> = ({
  profilePhoto,
  name,
  isConnected,
  size = 'md',
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const initials = name.split(' ').slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase();

  // Determina se deve mostrar a imagem ou as iniciais
  const shouldShowImage = profilePhoto && isConnected && !imageError && imageLoaded;

  // Debug log
  useEffect(() => {
    console.log('UserProfileAvatar Debug:', {
      profilePhoto,
      name,
      isConnected,
      imageError,
      imageLoaded,
      shouldShowImage
    });
  }, [profilePhoto, name, isConnected, imageError, imageLoaded, shouldShowImage]);

  return (
    <div className={`relative ${className}`}>
      {/* Container base com iniciais - sempre presente */}
      <div 
        className={`${sizeClasses[size]} rounded-full border-2 border-white flex items-center justify-center text-white font-semibold`}
        style={{ 
          background: isConnected 
            ? 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' 
            : '#9CA3AF'
        }}
      >
        {initials}
      </div>
      
      {/* Profile Photo - sobrepõe as iniciais quando disponível */}
      {profilePhoto && isConnected && !imageError && (
        <img 
          className={`${sizeClasses[size]} rounded-full border-2 border-white object-cover absolute top-0 left-0 ${
            shouldShowImage ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-200`}
          src={profilePhoto}
          alt={`${name} profile`}
          onError={() => {
            console.log('Image error for:', name);
            setImageError(true);
            setImageLoaded(false);
          }}
          onLoad={() => {
            console.log('Image loaded for:', name);
            setImageLoaded(true);
            setImageError(false);
          }}
        />
      )}
      
      {/* Status Indicator */}
      <span 
        className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white ${
          isConnected ? 'bg-green-400' : 'bg-gray-400'
        }`}
      />
    </div>
  );
};

export default UserProfileAvatar; 