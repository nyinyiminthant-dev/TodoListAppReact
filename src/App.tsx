import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppProvider from './AppProvider';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Analytics from './pages/Analytics';
import Plans from './pages/Plans';

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/plans" element={<Plans />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;