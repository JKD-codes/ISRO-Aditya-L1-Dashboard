import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import useMLStore from '../../store/useMLStore';
import { useStore } from '../../store/useStore';
import { getFlareInsight } from '../../services/groqService';
import gsap from '../../animations/gsap.config';
import axios from 'axios';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { API_BASE } from '../../config';

export function JudgeDemoPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const jPresses = useRef([]);
  const panelRef = useRef(null);
  const { triggerDemoMode, stopDemoMode, setLatestInsight, activeRegions } = useStore();
  const { mlForecast, neupertResult } = useMLStore();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'j') {
        const now = Date.now();
        jPresses.current.push(now);
        
        // Remove presses older than 1 second
        jPresses.current = jPresses.current.filter(t => now - t < 1000);
        
        if (jPresses.current.length >= 3) {
          setIsVisible(true);
          jPresses.current = [];
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let timer;
    if (isVisible) {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && panelRef.current) {
        gsap.fromTo(panelRef.current, 
          { y: 50, opacity: 0 }, 
          { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
        );
      }
      
      // Auto hide after 90s
      timer = setTimeout(() => {
        setIsVisible(false);
      }, 90000);
    }
    return () => clearTimeout(timer);
  }, [isVisible]);

  const handleSimulate = async (flareClass) => {
    try {
      // 1. Fetch synthetic data
      const res = await axios.get(`${API_BASE || 'http://localhost:8000'}/api/aditya/dual?flare=${flareClass}`);
      if (res.data) {
        const processedSolexs = (res.data.solexs || []).map(item => ({
          ...item,
          flux_log: item.flux > 0 ? Math.log10(item.flux) : 0
        }));
        
        useMLStore.setState({
          solexsLive: processedSolexs,
          heliosLive: res.data.helios || []
        });
      }

      // 2. Trigger UI demo state
      triggerDemoMode(flareClass);

      // 3. Run Groq Analysis
      setLatestInsight("Running live AI analysis via Groq...");
      const forecastProbs = mlForecast?.horizons?.[1]?.class_probs || { B: 10, C: 20, M: 50, X: 20 };
      
      const insight = await getFlareInsight({
        flux: flareClass, // Using class string as flux summary
        forecastProbs,
        neupert: { confirmed: true, lead_mins: 3 }, // Hardcoded for demo
        activeRegions: activeRegions?.[0]
      });
      
      setLatestInsight(insight);

    } catch (err) {
      console.error("Demo API error:", err);
      // Fallback
      triggerDemoMode(flareClass);
    }
  };

  const handleReset = () => {
    stopDemoMode();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-[100] w-[300px]">
      <Card className="border border-[#FF3B3B]/50 shadow-[0_0_20px_rgba(255,59,59,0.3)] bg-[#020B18]/95 backdrop-blur-md" p={3} title="JUDGE DEMO MODE">
        <div className="flex flex-col gap-2 mt-2">
          
          <button onClick={() => handleSimulate('M2.0')} className="w-full text-left px-3 py-2 bg-[#FFB347]/10 hover:bg-[#FFB347]/20 border border-[#FFB347]/30 rounded-sm font-mono text-[11px] text-[#FFB347] transition-colors flex justify-between items-center">
            <span>TRIGGER M2.0 FLARE</span>
            <ShieldAlert className="w-3 h-3" />
          </button>

          <button onClick={() => handleSimulate('M5.2')} className="w-full text-left px-3 py-2 bg-[#FFB347]/10 hover:bg-[#FFB347]/20 border border-[#FFB347]/30 rounded-sm font-mono text-[11px] text-[#FFB347] transition-colors flex justify-between items-center">
            <span>TRIGGER M5.2 FLARE</span>
            <ShieldAlert className="w-3 h-3" />
          </button>

          <button onClick={() => handleSimulate('X1.0')} className="w-full text-left px-3 py-2 bg-[#FF3B3B]/10 hover:bg-[#FF3B3B]/20 border border-[#FF3B3B]/30 rounded-sm font-mono text-[11px] text-[#FF3B3B] transition-colors flex justify-between items-center">
            <span>TRIGGER X1.0 FLARE</span>
            <ShieldAlert className="w-3 h-3" />
          </button>

          <button onClick={() => handleSimulate('X3.5')} className="w-full text-left px-3 py-2 bg-[#FF3B3B]/10 hover:bg-[#FF3B3B]/20 border border-[#FF3B3B]/30 rounded-sm font-mono text-[11px] text-[#FF3B3B] transition-colors flex justify-between items-center">
            <span>TRIGGER X3.5 FLARE</span>
            <ShieldAlert className="w-3 h-3" />
          </button>

          <button onClick={handleReset} className="w-full mt-2 text-left px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm font-mono text-[11px] text-text-primary transition-colors flex justify-between items-center">
            <span>RESET SYSTEM</span>
            <RefreshCw className="w-3 h-3" />
          </button>

        </div>
      </Card>
    </div>
  );
}
