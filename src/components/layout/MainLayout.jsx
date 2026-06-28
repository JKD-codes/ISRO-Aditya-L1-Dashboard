import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { JudgeDemoPanel } from '../dashboard/JudgeDemoPanel';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

const factCards = [
  "Live data from GOES-18 · Updated 60s · NOAA SWPC",
  "Aditya-L1 SoLEXS covers 2–22 keV · HEL1OS covers 10–150 keV · Gannon Storm: largest since 2003",
  "Neupert Effect: hard X-ray peaks 3min before soft X-ray · Confirms particle acceleration mechanism",
  "Flare onset detection algorithm: rate-of-rise + flux ratio + AR complexity → <60s detection latency"
];

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { presentationMode } = useStore();
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    let interval = null;
    if (presentationMode) {
      interval = setInterval(() => {
        setFactIndex(prev => (prev + 1) % factCards.length);
      }, 8000);
    } else {
      setFactIndex(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [presentationMode]);

  return (
    <div 
      className="flex h-screen w-full overflow-hidden bg-background-primary transition-all duration-300"
      style={{ fontSize: presentationMode ? '1.12em' : '1em' }}
    >
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="md:hidden flex items-center p-4 border-b-[1px] border-[rgba(255,107,0,0.3)] bg-background-secondary shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="text-text-primary hover:text-accent-orange transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="ml-4 flex items-center">
             <div className="w-6 h-6 rounded-full border-[1.5px] border-accent-orange flex items-center justify-center mr-2">
                <span className="font-display font-semibold text-accent-orange text-[8px]">A-L1</span>
             </div>
             <span className="font-mono text-sm tracking-widest text-text-primary">ADITYA-L1 DASHBOARD</span>
          </div>
        </div>

        <div className="hidden md:block">
          <TopNav />
        </div>

        <main className={cn(
          "flex-1 overflow-auto relative",
          presentationMode ? "pb-[80px]" : ""
        )}>
          <div key={location.pathname} className="absolute inset-0 p-6 page-fade-in">
            <Outlet />
          </div>
        </main>

        {/* Presentation Mode Bottom Overlay */}
        {presentationMode && (
          <div className="absolute bottom-0 left-0 right-0 h-[80px] bg-[#020B18]/95 border-t border-[rgba(255,107,0,0.25)] px-6 flex items-center justify-between z-50 animate-slide-up shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
            <div className="flex-1 max-w-4/5 flex flex-col justify-center">
              <span className="font-mono text-[9px] text-text-secondary uppercase tracking-widest mb-1">
                EXPERT PHYSICS INSIGHT
              </span>
              <p className="font-mono text-xs text-text-primary font-medium tracking-wide animate-fade-in truncate">
                {factCards[factIndex]}
              </p>
            </div>
            
            <div className="shrink-0 flex items-center gap-2">
              <div className="bg-[rgba(255,107,0,0.1)] border border-[rgba(255,107,0,0.4)] px-2.5 py-1 rounded text-[9px] font-mono text-accent-orange font-bold uppercase tracking-wider animate-pulse">
                PRESENTATION MODE
              </div>
            </div>
          </div>
        )}
      </div>
      <JudgeDemoPanel />
    </div>
  );
}


