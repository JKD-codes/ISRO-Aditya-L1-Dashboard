import React, { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

export function ActiveRegionTable() {
  const { activeRegions } = useStore();
  const [animateId, setAnimateId] = useState(0);

  useEffect(() => {
    // Trigger animation when activeRegions change
    setAnimateId(prev => prev + 1);
  }, [activeRegions]);

  const CURRENT_SOLAR_CONTEXT = {
    'AR4478': { m: 45, x: 20 },
    'AR4475': { m: 15, x: 5 },
    'AR4473': { m: 5, x: 1 },
    'AR4476': { m: 25, x: 10 }
  };

  const getMagClassBorder = (magClass) => {
    if (!magClass) return 'border-transparent';
    if (magClass.includes('Delta')) return 'border-[#FF3B3B]';
    if (magClass.includes('Gamma')) return 'border-[#FFB347]';
    if (magClass.includes('Beta')) return 'border-[#4FC3F7]';
    return 'border-[#8FA3C0]'; // Alpha
  };

  // Fallback to static data if no backend data
  const regions = activeRegions?.length > 0 ? activeRegions : [
    { id: 'AR4478', Region: '4478', Mag: 'Beta-Gamma-Delta', M_flare_prob: 45, X_flare_prob: 20 },
    { id: 'AR4475', Region: '4475', Mag: 'Beta', M_flare_prob: 15, X_flare_prob: 5 },
    { id: 'AR4476', Region: '4476', Mag: 'Beta-Gamma', M_flare_prob: 25, X_flare_prob: 10 },
    { id: 'AR4473', Region: '4473', Mag: 'Alpha', M_flare_prob: 5, X_flare_prob: 1 }
  ];

  return (
    <Card className="flex flex-col h-full min-h-[240px]" p={0}>
      <div className="px-4 py-2 bg-[#020B18] border-b-[0.5px] border-border-subtle shrink-0">
        <h3 className="font-mono text-[10px] text-text-primary uppercase tracking-widest">
          ACTIVE REGIONS (AIA 193Å)
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto w-full p-2" key={animateId} style={{ animation: 'rowUpdate 0.6s ease' }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-[0.5px] border-border-subtle/50 font-mono text-[9px] text-text-secondary">
              <th className="pb-1 pl-2 font-normal">AR</th>
              <th className="pb-1 font-normal">MAG</th>
              <th className="pb-1 font-normal">M%</th>
              <th className="pb-1 font-normal pr-2 text-right">X%</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[10px]">
            {regions.map((ar, i) => {
              const regionNum = ar.Region || ar.id?.replace('AR', '') || '----';
              const mag = ar.Mag || ar.mag || 'Alpha';
              const mProb = ar.M_flare_prob || ar.m_flare_prob || CURRENT_SOLAR_CONTEXT[`AR${regionNum}`]?.m || 0;
              const xProb = ar.X_flare_prob || ar.x_flare_prob || CURRENT_SOLAR_CONTEXT[`AR${regionNum}`]?.x || 0;
              const isTarget = regionNum === '4478';

              return (
                <tr 
                  key={regionNum || i} 
                  className={cn(
                    "border-b-[0.5px] border-border-subtle/20 hover:bg-white/[0.02] transition-colors",
                    isTarget && "bg-[rgba(255,107,0,0.08)]"
                  )}
                >
                  <td className={cn("py-2 pl-2 border-l-2", getMagClassBorder(mag))}>
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "font-bold",
                        isTarget ? "text-[#FF3B3B]" : "text-text-primary"
                      )}>
                        {regionNum}
                      </span>
                    </div>
                  </td>
                  <td className="py-2">
                    <span className="opacity-80 truncate block max-w-[80px]" title={mag}>{mag}</span>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-1.5">
                      <span className={mProb >= 30 ? "text-[#FFB347]" : "text-text-primary"}>
                        {mProb}%
                      </span>
                      <div className="w-6 h-1 bg-[#01050A] rounded-sm overflow-hidden hidden sm:block">
                        <div className="h-full bg-[#FFB347]" style={{ width: `${mProb}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={xProb >= 10 ? "text-[#FF3B3B]" : "text-text-primary"}>
                        {xProb}%
                      </span>
                      <div className="w-6 h-1 bg-[#01050A] rounded-sm overflow-hidden hidden sm:block">
                        <div className="h-full bg-[#FF3B3B]" style={{ width: `${xProb}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
