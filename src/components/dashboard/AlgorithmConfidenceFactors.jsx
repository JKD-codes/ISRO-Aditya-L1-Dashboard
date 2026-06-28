import React, { useMemo } from 'react';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';
import { useQuery } from '@tanstack/react-query';
import { getGoesFlares } from '../../services/api';

export function AlgorithmConfidenceFactors() {
  const { goesData, activeRegions, demoActive } = useStore();

  // Fetch 7-day flares list using cached React Query
  const { data: flares } = useQuery({
    queryKey: ['goesFlares'],
    queryFn: getGoesFlares,
    refetchInterval: 300000,
  });

  const confidenceData = useMemo(() => {
    // 1. Flux Level
    let flux = 1e-8;
    if (demoActive) {
      flux = 5.2e-5;
    } else if (goesData && goesData.length > 0) {
      const channelB = goesData.filter(d => d.energy === '0.1-0.8nm' || d.energy_band === '0.1-0.8nm');
      const points = channelB.length > 0 ? channelB : goesData;
      flux = points[points.length - 1]?.flux || 1e-8;
    }
    const logFlux = Math.log10(flux);
    const fluxPct = Math.max(10, Math.min(100, Math.round(((logFlux + 9) / 6) * 100)));
    const getFluxColor = (pct) => {
      if (pct >= 66) return '#FF3B3B'; // Red for warning/alert flux
      if (pct >= 33) return '#FFB347'; // Amber for elevated flux
      return '#00E5A0'; // Green for nominal flux
    };

    // 2. Rate of Rise (last 10 minutes)
    let rateOfRise = 0;
    if (demoActive) {
      rateOfRise = 2.5e-8;
    } else if (goesData && goesData.length >= 10) {
      const channelB = goesData.filter(d => d.energy === '0.1-0.8nm' || d.energy_band === '0.1-0.8nm');
      const points = channelB.length >= 10 ? channelB.slice(-10) : goesData.slice(-10);
      if (points.length >= 2) {
        const startFlux = points[0].flux || 1e-8;
        const endFlux = points[points.length - 1].flux || 1e-8;
        rateOfRise = (endFlux - startFlux) / (points.length * 60);
      }
    }
    const risePct = Math.max(10, Math.min(100, Math.round((Math.abs(rateOfRise) / 1e-8) * 100)));
    const riseColor = rateOfRise > 0 ? '#FFB347' : '#4FC3F7'; // Amber if rising, blue if falling

    // 3. Active Region Complexity
    let maxComplexityPct = 10;
    let complexityLabel = 'Alpha';
    let complexityColor = '#8FA3C0';

    if (activeRegions && activeRegions.length > 0) {
      activeRegions.forEach(r => {
        const mag = String(r.mag || r.Mag || 'Alpha');
        if (mag.includes('Delta') && maxComplexityPct < 100) {
          maxComplexityPct = 100;
          complexityLabel = 'Beta-Gamma-Delta';
          complexityColor = '#FF3B3B';
        } else if (mag.includes('Gamma') && maxComplexityPct < 70) {
          maxComplexityPct = 70;
          complexityLabel = 'Beta-Gamma';
          complexityColor = '#FFB347';
        } else if (mag.includes('Beta') && maxComplexityPct < 40) {
          maxComplexityPct = 40;
          complexityLabel = 'Beta';
          complexityColor = '#4FC3F7';
        }
      });
    } else if (demoActive) {
      maxComplexityPct = 100;
      complexityLabel = 'Beta-Gamma-Delta';
      complexityColor = '#FF3B3B';
    }

    // 4. Historical Context (24h count)
    let flareCount24h = 2;
    if (demoActive) {
      flareCount24h = 6;
    } else if (flares && flares.length > 0) {
      const now = Date.now();
      const dayAgo = now - 24 * 3600 * 1000;
      const count = flares.filter(f => {
        const tStr = f.begin_time || f.peak_time || f.max_time;
        if (!tStr) return false;
        return new Date(tStr).getTime() >= dayAgo;
      }).length;
      flareCount24h = count > 0 ? count : 2;
    }
    const historyPct = Math.max(10, Math.min(100, flareCount24h * 15));
    const historyColor = flareCount24h > 3 ? '#FFB347' : '#4FC3F7';

    return [
      { name: 'Flux Level', value: fluxPct, label: flux.toExponential(1) + ' W/m²', color: getFluxColor(fluxPct) },
      { name: 'Rate of Rise', value: risePct, label: rateOfRise > 0 ? 'RISING' : 'STABLE', color: riseColor },
      { name: 'Active Region Complexity', value: maxComplexityPct, label: complexityLabel, color: complexityColor },
      { name: 'Historical Context (24h)', value: historyPct, label: `${flareCount24h} Flares`, color: historyColor }
    ];
  }, [goesData, activeRegions, demoActive, flares]);

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
