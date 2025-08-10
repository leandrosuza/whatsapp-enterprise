'use client';

import { useApp } from '../../contexts/AppContext';
import AdminHome from '../../app/admin/home/page';
import WhatsAppView from '../../app/admin/view/WhatsAppViewComponent';
import ConversationsPage from '../../app/admin/conversations/page';
import ContactsPage from '../../app/admin/contacts/page';
import ContactsExplorerPage from '../../app/admin/lead-generator/page';
import AutomationsPage from '../../app/admin/automations/page';
import AnalyticsPage from '../../app/admin/analytics/page';
import SettingsPage from '../../app/admin/settings/page';

export default function DynamicContent() {
  const { currentView, subView, viewParams } = useApp();

  console.log('🔍 DynamicContent - currentView:', currentView);
  console.log('🔍 DynamicContent - subView:', subView);
  console.log('🔍 DynamicContent - viewParams:', viewParams);

  console.log('🎨 DynamicContent - Rendering view:', currentView, 'subView:', subView);

  // Add state verification
  if (!currentView) {
    console.log('⚠️ DynamicContent - No currentView, defaulting to dashboard');
    return <AdminHome />;
  }

  return (
    <>
      {currentView === 'dashboard' && (
        <>
          {subView === 'whatsapp-view' ? (
            <WhatsAppView
              key={`whatsapp-view-${viewParams.profileId}`}
              profileId={viewParams.profileId}
              profileName={viewParams.profileName}
              contactNumber={viewParams.contactNumber}
            />
          ) : (
            <AdminHome />
          )}
        </>
      )}
      {currentView === 'conversations' && <ConversationsPage />}
      {currentView === 'contacts' && <ContactsPage />}
      {currentView === 'lead-generator' && <ContactsExplorerPage />}
      {currentView === 'automations' && <AutomationsPage />}
      {currentView === 'analytics' && <AnalyticsPage />}
      {currentView === 'settings' && <SettingsPage />}
      
      {/* Fallback for debug */}
      {!['dashboard', 'conversations', 'contacts', 'lead-generator', 'automations', 'analytics', 'settings'].includes(currentView) && (
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Navigation Error</h2>
          <p className="text-gray-600 mb-4">View not found: {currentView}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      )}
    </>
  );
} 