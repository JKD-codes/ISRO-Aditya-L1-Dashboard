import React from 'react';
import { Card } from '../ui/Card';

export function PayloadStatus() {
  const missionStart = new Date('2024-01-06T00:00:00Z');
  const missionDays = Math.floor((Date.now() - missionStart) / 86400000);

  const SOLEXS_DATA = {
    name: 'SoLEXS',
    status: 'NOMINAL',
    mode: 'SCIENCE OBSERVATION',
    range: '2 – 22 keV',
    temp: '-20.0 °C',
    scienceHours: (missionDays * 24 * 0.85).toFixed(0),
  };

  const HELIOS_DATA = {
    name: 'HEL1OS',
    status: 'NOMINAL',
    mode: 'EVENT MODE',
    range: '10 – 150 keV',
    temp: '-40.5 °C',
    totalCounts: ((missionDays * 24 * 60 * 47) / 1e9).toFixed(2) + 'B',
  };

  return (
    <Card className="flex flex-col h-full min-h-[200px]" p={0}>
      <div className="px-3 py-2 border-b-[0.5px] border-border-subtle bg-[#020B18] flex justify-between items-center shrink-0">
        <span className="font-display text-[10px] tracking-wider text-text-primary uppercase font-bold">
          ADITYA-L1 PAYLOAD STATUS
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-between p-3 h-full">
        {/* SoLEXS Section */}
        <div className="flex flex-col gap-1.5 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display font-bold text-[#00E5A0] tracking-wider text-[11px]">{SOLEXS_DATA.name}</span>
            <span className="font-mono text-[9px] bg-[#00E5A0]/20 text-[#00E5A0] px-1.5 py-0.5 rounded-sm uppercase tracking-widest">
              {SOLEXS_DATA.status}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] font-mono">
            <div className="flex justify-between">
              <span className="text-text-secondary opacity-60">MODE:</span>
              <span className="text-text-primary">{SOLEXS_DATA.mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary opacity-60">TEMP:</span>
              <span className="text-[#4FC3F7]">{SOLEXS_DATA.temp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary opacity-60">RANGE:</span>
              <span className="text-text-primary">{SOLEXS_DATA.range}</span>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="h-[1px] w-full bg-[rgba(255,107,0,0.2)] my-1" />

        {/* HEL1OS Section */}
        <div className="flex flex-col gap-1.5 pt-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display font-bold text-[#FFB347] tracking-wider text-[11px]">{HELIOS_DATA.name}</span>
            <span className="font-mono text-[9px] bg-[#00E5A0]/20 text-[#00E5A0] px-1.5 py-0.5 rounded-sm uppercase tracking-widest">
              {HELIOS_DATA.status}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] font-mono">
            <div className="flex justify-between">
              <span className="text-text-secondary opacity-60">MODE:</span>
              <span className="text-text-primary">{HELIOS_DATA.mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary opacity-60">TEMP:</span>
              <span className="text-[#4FC3F7]">{HELIOS_DATA.temp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary opacity-60">RANGE:</span>
              <span className="text-text-primary">{HELIOS_DATA.range}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 py-1.5 border-t-[0.5px] border-border-subtle bg-[#020B18] flex justify-between items-center shrink-0">
        <span className="font-mono text-[9px] text-accent-orange uppercase">SCIENCE HOURS: {SOLEXS_DATA.scienceHours}h</span>
        <span className="font-mono text-[9px] text-accent-orange uppercase">EVENTS: {HELIOS_DATA.totalCounts}</span>
      </div>
    </Card>
  );
}
