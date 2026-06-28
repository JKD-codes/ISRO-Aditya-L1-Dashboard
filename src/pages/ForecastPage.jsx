import React, { useEffect, useRef } from 'react';
import { MLForecastPanel } from '../components/dashboard/MLForecastPanel';
import { LiveFluxChart } from '../components/dashboard/LiveFluxChart';
import { NeupertEffectPanel } from '../components/dashboard/NeupertEffectPanel';
import gsap from '../animations/gsap.config';
import { Activity } from 'lucide-react';

export default function ForecastPage() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      // Find all elements with the 'stagger-card' class
      const cards = containerRef.current.querySelectorAll('.stagger-card');
      
      // Animate them in sequentially
      gsap.fromTo(cards, 
        { opacity: 0, y: 40 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.8, 
          stagger: 0.15,
          ease: 'power3.out' 
        }
      );
    }
  }, []);

  return (
    <div ref={containerRef} className="p-4 flex flex-col gap-4 min-h-screen bg-[#020B18]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border-subtle pb-3 shrink-0">
        <Activity className="w-5 h-5 text-accent-orange" />
        <h1 className="font-display text-lg font-bold tracking-widest text-text-primary">
          SOLAR FLARE ML FORECAST
        </h1>
        <span className="px-2 py-0.5 bg-[#1E3A5F] text-white font-mono text-[9px] rounded">
          XGBOOST ENSEMBLE
        </span>
      </div>

      {/* Hero row: three MLForecastPanels */}
      <div className="flex gap-4 h-[280px] shrink-0">
        <div className="flex-1 stagger-card">
          <MLForecastPanel defaultHorizon={15} />
        </div>
        <div className="flex-1 stagger-card">
          <MLForecastPanel defaultHorizon={30} />
        </div>
        <div className="flex-1 stagger-card">
          <MLForecastPanel defaultHorizon={60} />
        </div>
      </div>

      {/* Full-width LiveFluxChart with dashed forecast extension */}
      <div className="flex-1 min-h-[350px] stagger-card">
        <LiveFluxChart showForecast={true} />
      </div>

      {/* NeupertEffectPanel full width */}
      <div className="h-[250px] shrink-0 stagger-card">
        <NeupertEffectPanel />
      </div>
    </div>
  );
}
