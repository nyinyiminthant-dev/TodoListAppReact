import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppProvider from './AppProvider';
import { LanguageProvider } from './contexts/LanguageContext';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Analytics from './pages/Analytics';
import Plans from './pages/Plans';
import InstallPWA from './components/InstallPWA';
import { TaskNotificationPopup, useNotificationChecker } from './hooks/useNotificationChecker';

function AppContent() {
  const { currentNotification, dismissNotification } = useNotificationChecker();
  
  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/plans" element={<Plans />} />
      </Routes>
      <InstallPWA />
      {currentNotification && (
        <TaskNotificationPopup 
          notification={currentNotification} 
          onClose={dismissNotification} 
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