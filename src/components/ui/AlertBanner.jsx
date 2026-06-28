import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';

export function AlertBanner({ className }) {
  const { activeAlert, clearAlert, demoActive } = useStore();
  const audioCtx = useRef(null);

  const isVisible = !!activeAlert;

  useEffect(() => {
    if (isVisible) {
      // Play low alert beep using Web Audio API
      try {
        if (!audioCtx.current) {
          audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.current.state === 'suspended') {
          audioCtx.current.resume();
        }
        const playBeep = () => {
           const oscillator = audioCtx.current.createOscillator();
           const gainNode = audioCtx.current.createGain();
           
           oscillator.type = 'sine';
           oscillator.frequency.setValueAtTime(440, audioCtx.current.currentTime);
           
           gainNode.gain.setValueAtTime(0.08, audioCtx.current.currentTime);
           gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.current.currentTime + 0.8);
           
           oscillator.connect(gainNode);
           gainNode.connect(audioCtx.current.destination);
           
           oscillator.start();
           oscillator.stop(audioCtx.current.currentTime + 0.8);
        };
        playBeep();
      } catch (e) {
        console.warn('Web Audio API blocked or not supported:', e);
      }
    }
  }, [isVisible, activeAlert]);

  if (!isVisible || !activeAlert) return null;

  // Determine class details
  const flareClass = activeAlert.class || 'M5.2';
  const alertTime = activeAlert.time ? new Date(activeAlert.time).toLocaleTimeString([], { hour12: false }) : '--:--:--';
  const regionId = activeAlert.region || '3664';
  
  // Calculate approximate duration in minutes since alert trigger
  const elapsedMins = Math.round((Date.now() - new Date(activeAlert.time).getTime()) / 60000);
  const durationStr = elapsedMins > 0 ? `${elapsedMins}m` : 'onset';

  const classLetter = flareClass.charAt(0).toUpperCase();

  // Class colors mapping
  const colorMap = {
    X: { border: '#FF3B3B', text: '#FF3B3B', bg: 'rgba(255,59,59,0.08)' },
    M: { border: '#FFB347', text: '#FFB347', bg: 'rgba(255,179,71,0.08)' },
    C: { border: '#4FC3F7', text: '#4FC3F7', bg: 'rgba(79,195,247,0.08)' },
    B: { border: '#8FA3C0', text: '#8FA3C0', bg: 'rgba(143,163,192,0.08)' }
  };

  const currentTheme = colorMap[classLetter] || colorMap.M;

  const scrollToChart = (e) => {
    e.preventDefault();
    const chartEl = document.getElementById('live-flux-chart');
    if (chartEl) {
      chartEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div 
      className={cn(
        "w-full border-l-[3px] px-4 py-3 flex items-center justify-between transition-all duration-300",
        className
      )}
      style={{
        borderLeftColor: currentTheme.border,
        backgroundColor: currentTheme.bg
      }}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-bounce" style={{ color: currentTheme.text }} />
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
          <span className="font-display font-bold uppercase tracking-wide text-[12px] text-text-primary">
            ⚡ FLARE ONSET DETECTED: {flareClass}
          </span>
          <span className="font-mono text-[9px] text-text-secondary flex items-center gap-1.5">
            <span>{alertTime} UTC</span>
            <span>•</span>
            <span>Source: AR{regionId}</span>
            <span>•</span>
            <span>Duration: {durationStr}</span>
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <a 
          href="#live-flux-chart"
          onClick={scrollToChart}
          className="font-mono text-[9px] font-bold text-accent-orange hover:underline uppercase flex items-center gap-1"
        >
          <TrendingUp className="w-3 h-3" />
          <span>VIEW FLUX →</span>
        </a>
        <button 
          onClick={clearAlert} 
          className="text-text-secondary hover:text-text-primary border border-border-subtle/50 px-2 py-0.5 rounded-sm font-mono text-[9px] uppercase tracking-wider bg-background-secondary/40"
        >
          DISMISS
        </button>
      </div>
    </div>
  );
}

