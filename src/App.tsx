import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppProvider from './AppProvider';
import { LanguageProvider } from './contexts/LanguageContext';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Analytics from './pages/Analytics';
import Plans from './pages/Plans';
import Profile from './pages/Profile';
import InstallPWA from './components/InstallPWA';
import UpdateBanner from './components/UpdateBanner';
import { TaskNotificationPopup, useNotificationChecker } from './hooks/useNotificationChecker';
import { usePWAUpdate } from './hooks/usePWAUpdate';

function AppContent() {
  const { currentNotification, dismissNotification, markAsStarted } = useNotificationChecker();
  const { updateAvailable, isUpdating, refreshApp, dismissUpdate } = usePWAUpdate();
  
  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      <InstallPWA />
      {updateAvailable && (
        <UpdateBanner 
          onUpdate={refreshApp} 
          onDismiss={dismissUpdate}
          isUpdating={isUpdating}
        />
      )}
      {currentNotification && (
        <TaskNotificationPopup 
          notification={currentNotification} 
          onClose={dismissNotification}
          onStart={markAsStarted}
        />
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;