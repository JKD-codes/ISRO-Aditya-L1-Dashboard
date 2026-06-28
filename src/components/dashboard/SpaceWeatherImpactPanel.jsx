import React, { useMemo } from 'react';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';

export function SpaceWeatherImpactPanel() {
  const { goesData, demoActive } = useStore();

  const metrics = useMemo(() => {
    // 1. Get probabilities
    let mProb = 15;
    let xProb = 5;
    let latestFlux = 1e-7;

    if (demoActive) {
      mProb = 65;
      xProb = 22;
      latestFlux = 5e-5;
    } else if (goesData && goesData.length > 0) {
      // Find latest flux
      const channelB = goesData.filter(d => d.energy === '0.1-0.8nm' || d.energy_band === '0.1-0.8nm');
      const points = channelB.length > 0 ? channelB : goesData;
      latestFlux = points[points.length - 1]?.flux || 1e-7;

      if (latestFlux >= 1e-6) { mProb = 35; xProb = 10; }
      if (latestFlux >= 5e-6) { mProb = 60; xProb = 20; }
      if (latestFlux >= 1e-5) { mProb = 90; xProb = 40; }
      if (latestFlux >= 5e-5) { mProb = 99; xProb = 75; }
    }

    // 2. Compute severity percentages (0-100)
    // GPS / Navigation based on current X-class probability
    const gpsVal = xProb;
    
    // HF Radio Comms based on M+X combined probability
    const hfVal = Math.min(100, mProb + xProb);

    // Satellite Operations based on overall flux level (log scale normalized between 1e-8 and 1e-4)
    // 1e-8 -> 10%, 1e-7 -> 20%, 1e-6 -> 40%, 1e-5 -> 70%, 1e-4 -> 100%
    let satVal = 10;
    if (latestFlux > 1e-8) {
      const logMin = Math.log10(1e-8);
      const logMax = Math.log10(1e-4);
      const logVal = Math.log10(latestFlux);
      const pct = ((logVal - logMin) / (logMax - logMin)) * 100;
      satVal = Math.max(10, Math.min(100, Math.round(pct)));
    }

    const getColor = (val) => {
      if (val >= 60) return '#FF3B3B'; // Red
      if (val >= 30) return '#FFB347'; // Amber
      return '#00E5A0'; // Green
    };

    return [
      { name: 'GPS / Navigation', value: gpsVal, color: getColor(gpsVal), description: 'Severity matches X-class probability' },
      { name: 'HF Radio Comms', value: hfVal, color: getColor(hfVal), description: 'Severity matches combined M+X probability' },
      { name: 'Satellite Operations', value: satVal, color: getColor(satVal), description: 'Severity matches current solar flux level' }
    ];
  }, [goesData, demoActive]);

  return (
    <Card title="SPACE WEATHER IMPACT PANEL">
      <div className="flex flex-col gap-4 py-2">
        {metrics.map((row, idx) => (
          <div key={idx} className="flex flex-col gap-1.5" title={row.description}>
            <div className="flex justify-between items-center text-xs">
              <span className="font-sans font-medium text-text-primary">{row.name}</span>
              <span className="font-mono text-xs font-bold" style={{ color: row.color }}>
                {row.value}%
              </span>
            </div>
            
            {/* Horizontal Bar */}
            <div className="h-2 w-full bg-[#020B18] border border-border-subtle rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out" 
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
