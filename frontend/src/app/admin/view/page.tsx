'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import WhatsAppViewComponent from './WhatsAppViewComponent';

export default function WhatsAppViewPage() {
  const searchParams = useSearchParams();
  
  // Obter parâmetros da URL
  const profileId = searchParams.get('profileId') || undefined;
  const profileName = searchParams.get('profileName') || 'WhatsApp Profile';
  const contactNumber = searchParams.get('contactNumber') || undefined;

  return (
    <WhatsAppViewComponent
      profileId={profileId}
      profileName={profileName}
      contactNumber={contactNumber}
    />
  );
} 