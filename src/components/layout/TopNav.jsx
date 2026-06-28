import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { ShieldAlert, Rocket, Settings, CheckCircle2, XCircle } from 'lucide-react';
import { checkApiHealth } from '../../services/api';
import { cn } from '../../lib/utils';

export function TopNav() {
  const { demoActive } = useStore();
  const [apiStatus, setApiStatus] = useState('unknown'); // 'nominal', 'error', 'unknown'
  const [timeStr, setTimeStr] = useState('');
  
  useEffect(() => {
    const updateTime = () => setTimeStr(new Date().toISOString().substring(11, 19));
    updateTime();
    const t = setInterval(updateTime, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      const isHealthy = await checkApiHealth();
      setApiStatus(isHealthy ? 'nominal' : 'error');
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="h-16 bg-[#020B18] border-b-[0.5px] border-border-subtle flex items-center justify-between px-4 sticky top-0 z-50 shrink-0">
      
      {/* Left zone (320px) */}
      <div className="flex items-center w-[320px] gap-3">
        <div className="w-10 h-10 bg-accent-orange/10 rounded-sm border border-accent-orange/30 flex items-center justify-center shrink-0">
          <Rocket className="w-5 h-5 text-accent-orange" />
        </div>
        <div className="flex flex-col justify-center">
          <h1 className="font-display font-semibold text-text-primary text-[16px] tracking-widest leading-none mb-1.5">
            ADITYA-L1 OPERATIONS
          </h1>
          <span className="font-mono text-[9px] text-text-secondary uppercase tracking-widest leading-none">
            ISRO · LAGRANGE POINT L1 · 1.5M km FROM EARTH
          </span>
        </div>
      </div>

      {/* Center zone */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <span className="font-mono text-[11px] text-text-secondary uppercase tracking-widest mb-1">
          MISSION DAY 144
        </span>
        <div className="font-mono text-[18px] text-text-primary font-bold tracking-wider leading-none">
          {timeStr} UTC
        </div>
        {demoActive && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#FFB347] rounded-full animate-pulse" />
            <span className="font-mono text-[10px] text-[#FFB347] uppercase tracking-widest">
              AR4478 WATCH
            </span>
          </div>
        )}
      </div>

      {/* Right zone */}
      <div className="flex items-center justify-end gap-3 w-auto min-w-[320px]">
        {demoActive && (
          <div className="flex items-center gap-2 bg-[#FF3B3B]/10 border border-[#FF3B3B]/30 px-3 py-1 rounded-sm mr-2">
            <ShieldAlert className="w-3.5 h-3.5 text-[#FF3B3B]" />
            <span className="font-mono text-[10px] text-[#FF3B3B] font-bold tracking-widest">
              DELTA REGION DETECTED (AR4478)
            </span>
          </div>
        )}

        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1 rounded-sm border",
          apiStatus === 'nominal' ? "bg-accent-green/10 border-accent-green/30" : 
          apiStatus === 'error' ? "bg-[#FF3B3B]/10 border-[#FF3B3B]/30" : 
          "bg-white/5 border-white/10"
        )}>
          {apiStatus === 'nominal' ? <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" /> : 
           apiStatus === 'error' ? <XCircle className="w-3.5 h-3.5 text-[#FF3B3B]" /> : 
           <div className="w-3.5 h-3.5 rounded-full border-2 border-text-secondary border-t-transparent animate-spin" />}
          <span className={cn(
            "font-mono text-[10px] font-bold tracking-widest",
            apiStatus === 'nominal' ? "text-accent-green" : 
            apiStatus === 'error' ? "text-[#FF3B3B]" : 
            "text-text-secondary"
          )}>
            API {apiStatus === 'nominal' ? '●' : apiStatus === 'error' ? 'ERR' : '...'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#8FA3C0]/10 border border-[#8FA3C0]/30 px-3 py-1 rounded-sm">
          <span className="w-2 h-2 bg-[#8FA3C0] rounded-full" />
          <span className="font-mono text-[10px] text-[#8FA3C0] font-bold tracking-widest">
            NOMINAL
          </span>
        </div>

        <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-sm transition-colors ml-1">
          <Settings className="w-4 h-4" />
        </button>
      </div>

    </nav>
  );
}
