import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { DualPayloadChart } from '../components/dashboard/DualPayloadChart';
import { Card } from '../components/ui/Card';
import { gannonStormData, fetchGannonStormData } from '../data/gannonStorm';
import { getGoesFlares } from '../services/api';
import { differenceInDays, format, subDays } from 'date-fns';

export function PayloadHealth() {
  const { goesData } = useStore();
  const [flares, setFlares] = useState([]);
  const [stormData, setStormData] = useState(gannonStormData);
  const [dataSource, setDataSource] = useState('loading');

  // Fetch real Gannon Storm data from API
  useEffect(() => {
    fetchGannonStormData().then(result => {
      setStormData(result);
      setDataSource(result.dataSource || 'synthetic_fallback');
    });
  }, []);
  
  // Calculate mission days
  const missionDays = useMemo(() => {
    const launchDate = new Date('2023-09-02T00:00:00Z');
    return Math.max(1, differenceInDays(new Date(), launchDate));
  }, []);

  // Fetch flares to find the last M/X trigger
  useEffect(() => {
    getGoesFlares().then(data => {
      if (data) setFlares(data);
    }).catch(err => console.error(err));
  }, []);

  // Derive latest trigger
  const lastTriggerTime = useMemo(() => {
    if (!flares || flares.length === 0) return "2024-05-10 06:54 UTC"; // Fallback to Gannon Storm peak
    const mxFlares = flares.filter(f => f.max_class && /^[MX]/i.test(f.max_class));
    if (mxFlares.length === 0) return "2024-05-10 06:54 UTC";
    const latest = mxFlares[mxFlares.length - 1];
    try {
      return format(new Date(latest.max_time), 'yyyy-MM-dd HH:mm') + " UTC";
    } catch (e) {
      return "2024-05-10 06:54 UTC";
    }
  }, [flares]);

  // Derive current GOES flux to compute CdTe count rate
  const latestFlux = useMemo(() => {
    if (!goesData || goesData.length === 0) return 1e-7; // Default background
    const channelB = goesData.filter(d => d.energy === '0.1-0.8nm' || d.energy_band === '0.1-0.8nm');
    const points = channelB.length > 0 ? channelB : goesData;
    return points[points.length - 1]?.flux || 1e-7;
  }, [goesData]);

  const countRate = latestFlux > 1e-6 ? "ELEVATED: ~2,400 c/s" : "BACKGROUND: ~47 c/s";

  // Calculations
  const solexsHours = (missionDays * 24 * 0.85).toLocaleString(undefined, { maximumFractionDigits: 0 }) + " hours";
  // (mission_days * 24 * 60 * 60 * 47) converted to billion counts
  const heliosCounts = ((missionDays * 24 * 3600 * 47) / 1e9).toFixed(2) + " billion counts";

  // Health timeline: last 30 days, nominal (static)
  const healthDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      days.push(subDays(today, i));
    }
    return days;
  }, []);

  return (
    <div className="h-full overflow-y-auto pb-6 pr-2">
      <div className="flex flex-col md:flex-row gap-6 min-h-full items-stretch">
        
        {/* Left Column - 40% */}
      <div className="w-full md:w-[40%] flex flex-col gap-6 shrink-0">
        
        {/* SoLEXS Card */}
        <Card title="SoLEXS INSTRUMENT TELEMETRY">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono text-text-secondary uppercase">PAYLOAD STATUS</span>
            <div className="flex items-center gap-2 bg-accent-green/10 border border-accent-green/30 px-2 py-0.5 rounded-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              <span className="font-mono text-[9px] text-accent-green font-bold">NOMINAL</span>
            </div>
          </div>
          
          <div className="h-[1px] bg-[rgba(255,107,0,0.12)] w-full mb-3" />

          <div className="flex flex-col gap-2 font-mono text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="font-sans text-text-secondary">Observational Mode</span>
              <span className="text-text-primary">SCIENCE OBSERVATION</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-sans text-text-secondary">Energy Range</span>
              <span className="text-text-primary">2 – 22 keV</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-sans text-text-secondary">Spectral Resolution</span>
              <span className="text-text-primary">~170 eV @ 6 keV</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-sans text-text-secondary">Detector Type</span>
              <span className="text-text-primary">SDD (Silicon Drift Detector)</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-sans text-text-secondary">Operating Temperature</span>
              <span className="text-accent-green">-20.0 °C</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-sans text-text-secondary">Last Calibration</span>
              <span className="text-text-primary">2024-07-01</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-sans text-text-secondary">Total Observation Time</span>
              <span className="text-accent-orange font-bold">{solexsHours}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-sans text-text-secondary">Average Data Volume</span>
              <span className="text-text-primary">~2.1 GB/day (L1 FITS)</span>
            </div>
          </div>

          <a 
            href="https://pradan.issdc.gov.in/al1/" 
            target="_blank" 
            rel="noreferrer"
            className="mt-4 text-center block text-[10px] font-mono text-accent-orange hover:underline uppercase tracking-wider"
          >
            View Data on PRADAN →
          </a>
        </Card>

        {/* HEL1OS Card */}
        <Card title="HEL1OS INSTRUMENT TELEMETRY">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono text-text-secondary uppercase">PAYLOAD STATUS</span>
            <div className="flex items-center gap-2 bg-accent-green/10 border border-accent-green/30 px-2 py-0.5 rounded-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              <span className="font-mono text-[9px] text-accent-green font-bold">NOMINAL</span>
            </div>
          </div>

          <div className="h-[1px] bg-[rgba(255,107,0,0.12)] w-full mb-3" />

          <div className="flex flex-col gap-2 font-mono text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="font-sans text-text-secondary">Observational Mode</span>
              <span className="text-text-primary">EVENT MODE (100% duty)</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-sans text-text-secondary">Energy Range</span>
              <span className="text-text-primary">10 – 150 keV</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-sans text-text-secondary">Detector Type</span>
              <span className="text-text-primary">CdTe (Cadmium Telluride)</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-sans text-text-secondary">Operating Temperature</span>
              <span className="text-accent-green">-40.5 °C</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-sans text-text-secondary">Current Count Rate</span>
              <span className={`font-bold ${latestFlux > 1e-6 ? 'text-accent-red' : 'text-accent-green'}`}>{countRate}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-sans text-text-secondary">Total Events Recorded</span>
              <span className="text-accent-orange font-bold">{heliosCounts}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-sans text-text-secondary">Last Trigger Flare</span>
              <span className="text-text-primary font-bold text-[11px]">{lastTriggerTime}</span>
            </div>
          </div>

          <a 
            href="https://pradan.issdc.gov.in/al1/" 
            target="_blank" 
            rel="noreferrer"
            className="mt-4 text-center block text-[10px] font-mono text-accent-orange hover:underline uppercase tracking-wider"
          >
            View Data on PRADAN →
          </a>
        </Card>

        {/* Instrument Health Timeline */}
        <Card title="30-DAY UPTIME TIMELINE">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[9px] font-mono text-text-secondary">30d Uptime: 100.0%</span>
            <div className="flex items-center gap-3 text-[9px] font-mono text-text-secondary">
              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-accent-green rounded-sm" /> Nominal</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-accent-amber rounded-sm" /> Degraded</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-500 rounded-sm" /> No Data</div>
            </div>
          </div>

          {/* Timeline Bar */}
          <div className="flex gap-0.5 justify-between h-5 bg-[#020B18] p-1 border border-border-subtle rounded-sm">
            {healthDays.map((_, index) => (
              <div 
                key={index}
                className="flex-1 bg-accent-green opacity-90 hover:opacity-100 transition-opacity rounded-sm cursor-pointer"
                title={`Day -${30 - index}: Nominal`}
              />
            ))}
          </div>

          {/* X Axis ticks */}
          <div className="flex justify-between text-[9px] font-mono text-text-secondary mt-1 px-1">
            <span>{format(healthDays[0], 'MMM dd')}</span>
            <span>{format(healthDays[9], 'dd')}</span>
            <span>{format(healthDays[19], 'dd')}</span>
            <span>{format(healthDays[29], 'MMM dd')}</span>
          </div>
        </Card>

      </div>

      {/* Right Column - 60% */}
      <div className="flex-1 flex flex-col gap-6">
        
        {/* Chart Card */}
        <div className="flex flex-col gap-2 flex-1">
          {/* Dropdown Selector */}
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs text-text-secondary">SELECT PIPELINE INPUT:</span>
            <select className="bg-background-tertiary border border-border-emphasis px-3 py-1 text-xs text-text-primary font-mono rounded-sm outline-none cursor-pointer">
              <option>Event: X2.2 Gannon Storm (May 10, 2024)</option>
            </select>
          </div>
          
          <DualPayloadChart 
            data={stormData} 
            title="ADITYA-L1 FORECASTING ALGORITHM PIPELINE"
            dataSource={dataSource}
          />
        </div>

        {/* Algorithm Pipeline Diagram Panel */}
        <Card title="ALGORITHM PIPELINE DIAGRAM" className="min-h-[180px] shrink-0">
          <div className="flex-1 w-full bg-[#020B18] border border-border-subtle p-3 rounded-sm">
            
            {/* SVG Diagram */}
            <svg viewBox="0 0 760 120" className="w-full h-full overflow-visible">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#FF6B00" />
                </marker>
              </defs>

              {/* SoLEXS Path */}
              <g>
                <rect x="10" y="10" width="110" height="30" rx="3" fill="#071E3D" stroke="rgba(255, 107, 0, 0.4)" strokeWidth="1" />
                <text x="65" y="28" fill="#F0F4FF" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">SoLEXS Data</text>
                
                <path d="M 120 25 L 150 25" stroke="#FF6B00" strokeWidth="1.5" markerEnd="url(#arrow)" />

                <rect x="160" y="10" width="115" height="30" rx="3" fill="#071E3D" stroke="rgba(255, 107, 0, 0.4)" strokeWidth="1" />
                <text x="217.5" y="28" fill="#F0F4FF" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">Flux Normalization</text>

                <path d="M 275 25 L 305 25" stroke="#FF6B00" strokeWidth="1.5" markerEnd="url(#arrow)" />

                <rect x="315" y="10" width="110" height="30" rx="3" fill="#071E3D" stroke="rgba(255, 107, 0, 0.4)" strokeWidth="1" />
                <text x="370" y="28" fill="#F0F4FF" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">Peak Detection</text>

                <path d="M 425 25 L 455 25" stroke="#FF6B00" strokeWidth="1.5" markerEnd="url(#arrow)" />

                <rect x="465" y="10" width="115" height="30" rx="3" fill="#071E3D" stroke="rgba(255, 107, 0, 0.4)" strokeWidth="1" />
                <text x="522.5" y="28" fill="#F0F4FF" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">Class Assignment</text>

                <path d="M 580 25 L 610 25" stroke="#FF6B00" strokeWidth="1.5" markerEnd="url(#arrow)" />

                <rect x="620" y="10" width="130" height="30" rx="3" fill="#071E3D" stroke="rgba(255, 107, 0, 0.4)" strokeWidth="1" />
                <text x="685" y="28" fill="#FF6B00" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="bold">Probability Output</text>
              </g>

              {/* HEL1OS Path */}
              <g>
                <rect x="10" y="70" width="110" height="30" rx="3" fill="#071E3D" stroke="rgba(255, 107, 0, 0.4)" strokeWidth="1" />
                <text x="65" y="88" fill="#F0F4FF" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">HEL1OS Data</text>

                <path d="M 120 85 L 150 85" stroke="#FF6B00" strokeWidth="1.5" markerEnd="url(#arrow)" />

                <rect x="160" y="70" width="115" height="30" rx="3" fill="#071E3D" stroke="rgba(255, 107, 0, 0.4)" strokeWidth="1" />
                <text x="217.5" y="88" fill="#F0F4FF" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">Count Rate Normal.</text>

                <path d="M 275 85 L 305 85" stroke="#FF6B00" strokeWidth="1.5" markerEnd="url(#arrow)" />

                <rect x="315" y="70" width="110" height="30" rx="3" fill="#071E3D" stroke="rgba(255, 107, 0, 0.4)" strokeWidth="1" />
                <text x="370" y="88" fill="#F0F4FF" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">Neupert Check</text>

                {/* Diagonal connection from Neupert Check to Class Assignment */}
                <path d="M 425 85 L 480 43" stroke="#FF6B00" strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#arrow)" />
              </g>
            </svg>

          </div>
        </Card>

      </div>

      </div>
    </div>
  );
}
