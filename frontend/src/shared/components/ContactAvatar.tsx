import React, { useState, useEffect } from 'react';
import { useContactPhotos } from '../hooks/useContactPhotos';

interface ContactAvatarProps {
  contactId: string;
  profileId?: string;
  name: string;
  avatar?: string | null;
  isGroup: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ContactAvatar: React.FC<ContactAvatarProps> = ({
  contactId,
  profileId,
  name,
  avatar,
  isGroup,
  size = 'md',
  className = ''
}) => {
  const { getContactPhoto } = useContactPhotos();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const initials = name.split(' ').slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase();

  // Get photo URL from cache or provided avatar
  const photoUrl = avatar || (profileId ? getContactPhoto(contactId, profileId) : null);

  const shouldShowImage = photoUrl && !imageError && !isGroup;
  const shouldShowInitials = !shouldShowImage || !imageLoaded;

  return (
    <div className={`relative ${className}`}>
      {/* Contact Photo */}
      {shouldShowImage && (
        <img 
          className={`${sizeClasses[size]} rounded-full border-2 border-white object-cover`}
          src={photoUrl}
          alt={`${name} profile`}
          onError={() => {
            setImageError(true);
            setImageLoaded(false);
          }}
          onLoad={() => {
            setImageLoaded(true);
            setImageError(false);
          }}
          style={{ display: imageLoaded ? 'block' : 'none' }}
        />
      )}
      
      {/* Initials Fallback */}
      <div 
        className={`${sizeClasses[size]} rounded-full border-2 border-white flex items-center justify-center text-white font-semibold ${
          shouldShowInitials ? 'flex' : 'hidden'
        }`}
        style={{ 
          background: isGroup 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
            : 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)'
        }}
      >
        {isGroup ? (
          <i className="fas fa-users text-xs"></i>
        ) : (
          initials
        )}
      </div>
      
      {/* Status Indicator */}
      <span 
        className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white ${
          isGroup ? 'bg-purple-400' : 'bg-green-400'
        }`}
      />
    </div>
  );
};

export default ContactAvatar; 