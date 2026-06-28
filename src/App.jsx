import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { HistoricalAnalysis } from './pages/HistoricalAnalysis';
import { PayloadHealth } from './pages/PayloadHealth';
import { About } from './pages/About';
import { useStore } from './store/useStore';

const queryClient = new QueryClient();

function App() {
  const { initStore } = useStore();

  useEffect(() => {
    const cleanup = initStore();
    return () => {
      cleanup.then(unsub => unsub && unsub());
    };
  }, [initStore]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="history" element={<HistoricalAnalysis />} />
            <Route path="payloads" element={<PayloadHealth />} />
            <Route path="about" element={<About />} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;

