import React from 'react';
import { Card } from '../ui/Card';

export function SolarWindMonitor() {
  const WIND_DATA = {
    speed: 412.5,
    density: 4.8,
    bz: -2.1,
    bt: 5.4,
    temp: 8.5
  };

  return (
    <Card className="flex flex-col h-full min-h-[110px]" p={0}>
      <div className="px-4 py-2 border-b-[0.5px] border-border-subtle bg-[#020B18] flex justify-between items-center shrink-0">
        <span className="font-display text-[10px] tracking-wider text-text-primary uppercase font-bold">
          SOLAR WIND L1
        </span>
        <span className="font-mono text-[9px] text-[#00E5A0]">NOMINAL</span>
      </div>

      <div className="flex-1 flex p-2 px-4 justify-between items-center">
        {/* Speed */}
        <div className="flex flex-col items-center">
          <span className="font-mono text-[9px] text-text-secondary opacity-70 mb-0.5">SPEED</span>
          <span className="font-mono text-sm font-bold text-text-primary">{WIND_DATA.speed}</span>
          <span className="font-mono text-[8px] text-text-secondary">km/s</span>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-8 bg-border-subtle/50" />

        {/* Density */}
        <div className="flex flex-col items-center">
          <span className="font-mono text-[9px] text-text-secondary opacity-70 mb-0.5">DENSITY</span>
          <span className="font-mono text-sm font-bold text-text-primary">{WIND_DATA.density}</span>
          <span className="font-mono text-[8px] text-text-secondary">p/cm³</span>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-8 bg-border-subtle/50" />

        {/* Bz */}
        <div className="flex flex-col items-center">
          <span className="font-mono text-[9px] text-text-secondary opacity-70 mb-0.5">Bz</span>
          <span className="font-mono text-sm font-bold text-[#FFB347]">{WIND_DATA.bz}</span>
          <span className="font-mono text-[8px] text-text-secondary">nT</span>
        </div>
      </div>
    </Card>
  );
}
