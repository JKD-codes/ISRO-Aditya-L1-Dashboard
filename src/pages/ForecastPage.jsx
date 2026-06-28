import React, { useEffect, useRef } from 'react';
import { MLForecastPanel } from '../components/dashboard/MLForecastPanel';
import { LiveFluxChart } from '../components/dashboard/LiveFluxChart';
import { NeupertEffectPanel } from '../components/dashboard/NeupertEffectPanel';
import { MasterCataloguePanel } from '../components/dashboard/MasterCataloguePanel';
import { FeatureVectorPanel } from '../components/dashboard/FeatureVectorPanel';
import gsap from '../animations/gsap.config';
import { Activity } from 'lucide-react';
import useMLStore from '../store/useMLStore';

export default function ForecastPage() {
  const containerRef = useRef(null);
  const mlForecast = useMLStore(state => state.mlForecast);

  useEffect(() => {
    if (containerRef.current) {
      const cards = containerRef.current.querySelectorAll('.stagger-card');
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
          {mlForecast?.model_version || 'XGBOOST ENSEMBLE'}
        </span>
        {mlForecast?.is_ml && (
          <span className="px-2 py-0.5 bg-green-900/30 text-green-400 border border-green-500/20 font-mono text-[9px] rounded">
            ✓ ML ACTIVE
          </span>
        )}
        {mlForecast?.lead_time_mins > 0 && (
          <span className="px-2 py-0.5 bg-purple-900/30 text-purple-300 border border-purple-500/20 font-mono text-[9px] rounded">
            LEAD: {mlForecast.lead_time_mins.toFixed(1)} MIN
          </span>
        )}
      </div>

      {/* Hero row: three MLForecastPanels */}
      <div className="flex flex-col lg:flex-row gap-4 lg:h-[280px] shrink-0">
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
      <div className="flex-1 min-h-[350px] flex flex-col stagger-card">
        <LiveFluxChart showForecast={true} />
      </div>

      {/* Live Feature Vector */}
      <div className="stagger-card">
        <FeatureVectorPanel />
      </div>

      {/* NeupertEffectPanel full width */}
      <div className="h-auto lg:h-[250px] shrink-0 stagger-card">
        <NeupertEffectPanel />
      </div>

      {/* Master Catalogue */}
      <div className="stagger-card">
        <MasterCataloguePanel />
      </div>
    </div>
  );
}
