// Utility function to load profiles consistently
export const loadProfilesUtility = async (setProfiles: (profiles: any[]) => void) => {
  try {
    console.log('🔄 Loading profiles...');
    const response = await fetch('/api/whatsapp/profiles');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Profiles loaded successfully:', data.length, 'profiles');
      setProfiles(data);
    } else {
      console.error('❌ Failed to load profiles:', response.status, response.statusText);
      setProfiles([]);
    }
  } catch (error) {
    console.error('❌ Error loading profiles:', error);
    setProfiles([]);
  }
};

// Utility function to check backend and load profiles
export const checkBackendAndLoadProfilesUtility = async (setProfiles: (profiles: any[]) => void) => {
  try {
    const healthCheck = await fetch('http://localhost:3001/health');
    if (healthCheck.ok) {
      console.log('✅ Backend is running, loading profiles...');
      await loadProfilesUtility(setProfiles);
    } else {
      console.warn('⚠️ Backend health check failed, will retry...');
      setProfiles([]);
    }
  } catch (error) {
    console.warn('⚠️ Backend not accessible, will retry...', error);
    setProfiles([]);
  }
}; 