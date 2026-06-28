import React, { useMemo } from 'react';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';

export function AlgorithmConfidenceFactors() {
  const { pipelineNowcast } = useStore();

  const confidenceData = useMemo(() => {
    const detection = pipelineNowcast?.detection;
    
    // 1. Flux Level
    const fluxRatio = pipelineNowcast?.flux_ratio ?? 1.0;
    const fluxPct = Math.max(5, Math.min(100, Math.round((fluxRatio / 100) * 100))); 
    const getFluxColor = (ratio) => {
      if (ratio >= 50) return '#FF3B3B'; // Severe rise
      if (ratio >= 5) return '#FFB347'; // Moderate rise
      return '#00E5A0'; // Nominal
    };
    const fluxColor = getFluxColor(fluxRatio);

    // 2. Rate of Rise
    const riseRate = detection?.rise_rate_wm2_per_min ?? 0;
    // Map log-scale or simple scaling for percentage
    const risePct = Math.max(0, Math.min(100, Math.round((riseRate / 1e-5) * 100)));
    const riseColor = riseRate > 0 ? '#FFB347' : '#4FC3F7';

    // 3. Neupert Check
    const neupertConfirmed = detection?.neupert_confirmed ?? false;
    const neupertPct = neupertConfirmed ? 100 : 0;
    const neupertColor = neupertConfirmed ? '#00E5A0' : '#FF3B3B';
    const neupertLabel = neupertConfirmed ? 'CONFIRMED' : 'NO DELAY DETECTED';

    // 4. Cross Correlation
    const crossCorr = detection?.cross_correlation_dsxr_hxr ?? 0;
    const crossPct = Math.max(0, Math.min(100, Math.round(crossCorr * 100)));
    const crossColor = crossCorr > 0.6 ? '#00E5A0' : crossCorr > 0.3 ? '#FFB347' : '#FF3B3B';

    return [
      { name: 'Flux Level (Ratio)', value: fluxPct, label: `${fluxRatio.toFixed(1)}x`, color: fluxColor },
      { name: 'Rate of Rise', value: risePct, label: riseRate > 0 ? `${riseRate.toExponential(1)} W/m²/m` : 'STABLE', color: riseColor },
      { name: 'Neupert Check', value: neupertPct, label: neupertLabel, color: neupertColor },
      { name: 'Cross-Correlation (dSXR/dt vs HXR)', value: crossPct, label: `r = ${crossCorr.toFixed(3)}`, color: crossColor }
    ];
  }, [pipelineNowcast]);

  return (
    <Card title="ALGORITHM CONFIDENCE FACTORS" className="flex flex-col h-full justify-center">
      {/* Title separator */}
      <div className="h-[1px] bg-[rgba(255,107,0,0.15)] w-full mb-4 -mt-2" />
      
      <div className="flex flex-col gap-4">
        {confidenceData.map((row, idx) => (
          <div key={idx} className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-text-secondary uppercase tracking-wider">{row.name}</span>
              <span className="font-bold uppercase" style={{ color: row.color }}>
                {row.label} ({row.value}%)
              </span>
            </div>
            
            {/* Horizontal Bar */}
            <div className="h-1.5 w-full bg-[#020B18] border border-border-subtle/60 rounded-sm overflow-hidden">
              <div 
                className="h-full transition-all duration-[800ms] ease-out" 
                style={{ 
                  width: `${row.value}%`,
                  backgroundColor: row.color 
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
