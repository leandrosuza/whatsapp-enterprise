import { useState, useEffect } from 'react';

interface UseContactPhotosReturn {
  getContactPhoto: (contactId: string, profileId: string) => string | null;
  fetchContactPhoto: (contactId: string, profileId: string) => Promise<void>;
  loadingPhotos: Set<string>;
  errorPhotos: Set<string>;
}

export const useContactPhotos = (): UseContactPhotosReturn => {
  const [photoCache, setPhotoCache] = useState<Map<string, string>>(new Map());
  const [loadingPhotos, setLoadingPhotos] = useState<Set<string>>(new Set());
  const [errorPhotos, setErrorPhotos] = useState<Set<string>>(new Set());

  const getContactPhoto = (contactId: string, profileId: string): string | null => {
    const cacheKey = `${contactId}-${profileId}`;
    
    // Return cached photo if available
    if (photoCache.has(cacheKey)) {
      return photoCache.get(cacheKey) || null;
    }

    // Return null if already tried and failed
    if (errorPhotos.has(cacheKey)) {
      return null;
    }

    // Return null if currently loading
    if (loadingPhotos.has(cacheKey)) {
      return null;
    }

    return null;
  };

  const fetchContactPhoto = async (contactId: string, profileId: string) => {
    const cacheKey = `${contactId}-${profileId}`;
    
    // Don't fetch if already cached, loading, or failed
    if (photoCache.has(cacheKey) || loadingPhotos.has(cacheKey) || errorPhotos.has(cacheKey)) {
      return;
    }

    // Mark as loading
    setLoadingPhotos(prev => new Set(prev).add(cacheKey));

    try {
      const response = await fetch(`/api/whatsapp/contacts/${contactId}/photo?profileId=${profileId}`);
      const data = await response.json();
      
      if (data.success && data.photoUrl) {
        // Cache the photo
        setPhotoCache(prev => new Map(prev).set(cacheKey, data.photoUrl));
        console.log('Contact photo cached:', { contactId, photoUrl: data.photoUrl });
      } else {
        // Mark as error
        setErrorPhotos(prev => new Set(prev).add(cacheKey));
        console.log('No photo available for contact:', contactId);
      }
    } catch (error) {
      // Mark as error
      setErrorPhotos(prev => new Set(prev).add(cacheKey));
      console.log('Error fetching contact photo:', { contactId, error });
    } finally {
      // Remove from loading
      setLoadingPhotos(prev => {
        const newSet = new Set(prev);
        newSet.delete(cacheKey);
        return newSet;
      });
    }
  };

  return {
    getContactPhoto,
    fetchContactPhoto,
    loadingPhotos,
    errorPhotos
  };
}; 