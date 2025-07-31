import fetch from 'node-fetch';

async function testChatsEndpoint() {
  try {
    console.log('🔍 Testing chats endpoint...');
    
    const profileId = '10'; // From the test results
    const apiUrl = 'http://localhost:3001';
    
    console.log(`📋 Testing GET ${apiUrl}/api/whatsapp/profiles/${profileId}/chats`);
    
    const response = await fetch(`${apiUrl}/api/whatsapp/profiles/${profileId}/chats`);
    
    console.log('📡 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Request failed:', errorText);
      return;
    }
    
    const chats = await response.json();
    
    console.log('✅ Chats response:');
    console.log(`  - Count: ${chats.length}`);
    console.log(`  - Is Array: ${Array.isArray(chats)}`);
    
    if (chats.length > 0) {
      console.log('📋 Sample chats:');
      chats.slice(0, 3).forEach((chat: any, index: number) => {
        console.log(`  ${index + 1}. ${chat.contact?.name || 'Unknown'} (${chat.id})`);
        console.log(`     - Is Group: ${chat.contact?.isGroup || false}`);
        console.log(`     - Last Message: ${chat.contact?.lastMessage || 'No message'}`);
        console.log(`     - Unread: ${chat.unreadCount || 0}`);
      });
      
      // Check if these are real chats or mock data
      const isMockData = chats.some((chat: any) => 
        chat.id === 'chat1' || 
        chat.id === 'chat2' || 
        chat.id === 'group1'
      );
      
      if (isMockData) {
        console.log('⚠️ WARNING: Mock data detected!');
        console.log('💡 This means the WhatsApp client is not properly connected.');
      } else {
        console.log('✅ Real WhatsApp chats detected!');
      }
    } else {
      console.log('📭 No chats found');
    }
    
  } catch (error) {
    console.error('❌ Error testing chats endpoint:', error);
  }
}

// Run the test
testChatsEndpoint(); 