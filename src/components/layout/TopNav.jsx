import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import useMLStore from '../../store/useMLStore';
import { ShieldAlert, Rocket, Settings, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { checkApiHealth } from '../../services/api';
import { cn } from '../../lib/utils';

export function TopNav() {
  const { demoActive, triggerDemoMode } = useStore();
  const { wsConnected } = useMLStore();
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
    <nav className="h-16 bg-[#020B18] border-b-[0.5px] border-border-subtle flex items-center justify-between px-4 sticky top-0 z-50 shrink-0 relative">
      
      {/* Left zone */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0 max-w-[40%]">
        <div className="w-10 h-10 bg-accent-orange/10 rounded-sm border border-accent-orange/30 hidden sm:flex items-center justify-center shrink-0">
          <Rocket className="w-5 h-5 text-accent-orange" />
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <h1 className="font-display font-semibold text-text-primary text-[14px] md:text-[16px] tracking-widest leading-none mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
            ADITYA-L1 OPERATIONS
          </h1>
          <span className="font-mono text-[8px] md:text-[9px] text-text-secondary uppercase tracking-widest leading-none whitespace-nowrap overflow-hidden text-ellipsis">
            ISRO · LAGRANGE POINT L1 · 1.5M km FROM EARTH
          </span>
        </div>
      </div>

      {/* Center zone - ABSOLUTE POSITIONED TO PREVENT OVERFLOW GLITCHES */}
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center px-2 shrink-0">
        <span className="font-mono text-[10px] md:text-[11px] text-text-secondary uppercase tracking-widest whitespace-nowrap">
          MISSION DAY 144
        </span>
        {demoActive && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#FFB347] rounded-full animate-pulse" />
            <span className="font-mono text-[9px] md:text-[10px] text-[#FFB347] uppercase tracking-widest whitespace-nowrap">
              AR4478 WATCH
            </span>
          </div>
        )}
      </div>

      {/* Right zone */}
      <div className="flex items-center justify-end gap-2 md:gap-3 min-w-0 max-w-[50%]">
        {demoActive && (
          <div className="flex items-center gap-2 bg-[#FF3B3B]/10 border border-[#FF3B3B]/30 px-3 py-1 rounded-sm mr-2">
            <ShieldAlert className="w-3.5 h-3.5 text-[#FF3B3B]" />
            <span className="font-mono text-[10px] text-[#FF3B3B] font-bold tracking-widest">
              SIMULATION ACTIVE
            </span>
          </div>
        )}

        {/* Simulate Flare Dropdown */}
        <select 
          onChange={(e) => {
            if (e.target.value) {
              triggerDemoMode(e.target.value);
              e.target.value = '';
            }
          }}
          className="bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF6B00] font-mono text-[10px] tracking-widest px-2 py-1 rounded-sm outline-none cursor-pointer hover:bg-[#FF6B00]/20 transition-colors"
        >
          <option value="">SIMULATE FLARE</option>
          <option value="M2.0">M2.0</option>
          <option value="M5.2">M5.2</option>
          <option value="X1.0">X1.0</option>
          <option value="X3.5">X3.5</option>
        </select>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-sm border bg-[#020B18] border-border-subtle">
          {wsConnected ? (
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse shadow-[0_0_8px_rgba(0,229,160,0.6)]" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-text-secondary" />
          )}
          <span className="font-mono text-[10px] text-text-secondary font-bold tracking-widest">
            WS
          </span>
        </div>

        <div className="hidden xl:flex items-center gap-1.5 bg-[#8FA3C0]/10 border border-[#8FA3C0]/30 px-3 py-1 rounded-sm shrink-0">
          <span className="w-2 h-2 bg-[#8FA3C0] rounded-full" />
          <span className="font-mono text-[10px] text-[#8FA3C0] font-bold tracking-widest uppercase whitespace-nowrap">
            L1 POINT · NOMINAL
          </span>
        </div>

        {/* Live Clock moved to right side */}
        <div className="font-mono text-[12px] md:text-[14px] text-text-primary font-bold tracking-wider leading-none ml-1 md:ml-2 shrink-0 whitespace-nowrap">
          {timeStr} UTC
        </div>

      </div>

    </nav>
  );
}
