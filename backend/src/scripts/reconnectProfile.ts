import fetch from 'node-fetch';

async function reconnectProfile() {
  try {
    console.log('🔄 Reconnecting WhatsApp profile...');
    
    const profileId = '10'; // From the test results
    const apiUrl = 'http://localhost:3001';
    
    console.log(`📋 POST ${apiUrl}/api/whatsapp/profiles/${profileId}/reconnect`);
    
    const response = await fetch(`${apiUrl}/api/whatsapp/profiles/${profileId}/reconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Reconnect failed:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Reconnect result:', result);
    
    if (result.success) {
      console.log('✅ Profile reconnected successfully!');
      console.log('💡 Now you can test the chats endpoint again.');
    } else {
      console.log('❌ Reconnect failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error reconnecting profile:', error);
  }
}

// Run the reconnect
reconnectProfile(); 