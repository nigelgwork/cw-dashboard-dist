import { useState } from 'react';
import { WebSocketProvider } from './context/WebSocketContext';
import { ToastProvider } from './context/ToastContext';
import Header, { ViewType } from './components/Layout/Header';
import FullPageView from './components/Layout/FullPageView';
import PinnedView from './components/Layout/PinnedView';
import SyncPanel from './components/Sync/SyncPanel';
import SettingsPanel from './components/Settings/SettingsPanel';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { usePinnedItems } from './hooks/usePinnedItems';

function AppContent() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const pinnedItems = usePinnedItems();

  return (
    <div className="min-h-screen bg-board-bg">
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        pinnedCount={pinnedItems.pinnedCount}
      />
      <ErrorBoundary>
        {activeView === 'dashboard' && (
          <PinnedView
            pinnedProjects={pinnedItems.pinnedProjects}
            pinnedOpportunities={pinnedItems.pinnedOpportunities}
            pinnedServiceTickets={pinnedItems.pinnedServiceTickets}
            togglePin={pinnedItems.togglePin}
          />
        )}
        {activeView === 'projects' && (
          <FullPageView
            type="projects"
            isPinned={pinnedItems.isPinned}
            togglePin={pinnedItems.togglePin}
          />
        )}
        {activeView === 'opportunities' && (
          <FullPageView
            type="opportunities"
            isPinned={pinnedItems.isPinned}
            togglePin={pinnedItems.togglePin}
          />
        )}
        {activeView === 'service-tickets' && (
          <FullPageView
            type="service-tickets"
            isPinned={pinnedItems.isPinned}
            togglePin={pinnedItems.togglePin}
          />
        )}
        {activeView === 'sync' && <SyncPanel />}
        {activeView === 'settings' && <SettingsPanel />}
      </ErrorBoundary>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <WebSocketProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </WebSocketProvider>
    </ToastProvider>
  );
}

export default App;
