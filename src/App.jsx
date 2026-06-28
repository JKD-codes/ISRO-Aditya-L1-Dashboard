import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { HistoricalAnalysis } from './pages/HistoricalAnalysis';
import { PayloadHealth } from './pages/PayloadHealth';
import { About } from './pages/About';
import ForecastPage from './pages/ForecastPage';
import ModelExplainerPage from './pages/ModelExplainerPage';
import AlertHistoryPage from './pages/AlertHistoryPage';
import { useStore } from './store/useStore';
import useMLStore from './store/useMLStore';
import { ToastManager } from './components/ui/ToastManager';
import { SettingsModal } from './components/ui/SettingsModal';
import { useWebSocket } from './hooks/useWebSocket';

const queryClient = new QueryClient();

function App() {
  const { initStore } = useStore();
  const startPolling = useMLStore(state => state.startPolling);
  
  // Hook handles websocket connection lifecycle automatically
  useWebSocket();

  // Watch for theme changes
  const themeContrast = useStore(state => state.themeContrast);
  useEffect(() => {
    document.body.className = '';
    if (themeContrast === 'midnight') {
      document.body.classList.add('theme-midnight');
    } else if (themeContrast === 'high-contrast') {
      document.body.classList.add('theme-high-contrast');
    }
  }, [themeContrast]);

  useEffect(() => {
    // Initialize main store
    const cleanup = initStore();
    
    // Initialize ML store polling
    startPolling();
    
    return () => {
      cleanup.then(unsub => unsub && unsub());
    };
  }, [initStore, startPolling]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="forecast" element={<ForecastPage />} />
            <Route path="model" element={<ModelExplainerPage />} />
            <Route path="alerts" element={<AlertHistoryPage />} />
            <Route path="history" element={<HistoricalAnalysis />} />
            <Route path="payloads" element={<PayloadHealth />} />
            <Route path="about" element={<About />} />
          </Route>
        </Routes>
        <ToastManager />
        <SettingsModal />
      </Router>
    </QueryClientProvider>
  );
}

export default App;

