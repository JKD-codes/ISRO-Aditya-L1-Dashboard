import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea } from 'recharts';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';

export function LiveFluxChart() {
  const { goesData, demoActive, lastUpdate } = useStore();
  const [fieldMap, setFieldMap] = useState(null);

  useEffect(() => {
    if (goesData && goesData.length > 0 && !fieldMap) {
      const s = goesData[0];
      const fluxBKey = ['flux','xrsb_flux','xrsb-flux','energy','flux_b'].find(k => s[k] !== undefined);
      const fluxAKey = ['flux_a','xrsa_flux','xrsa-flux','flux1'].find(k => s[k] !== undefined);
      const timeKey  = ['time_tag','timestamp','time','time-tag'].find(k => s[k] !== undefined);
      setFieldMap({ fluxBKey, fluxAKey, timeKey });
    }
  }, [goesData, fieldMap]);

  const parsedData = useMemo(() => {
    if (!goesData || goesData.length === 0 || !fieldMap) return [];
    
    const groups = {};
    goesData.forEach(item => {
      const t = item[fieldMap.timeKey];
      if (!groups[t]) {
        groups[t] = { time: new Date(t).getTime(), time_tag: t, xrsa: 1e-9, xrsb: 1e-9 };
      }
      
      const val = Math.max(1e-9, item[fieldMap.fluxBKey] || item[fieldMap.fluxAKey] || 0);
      
      // Attempt to separate A and B. For NOAA current endpoint, channel is in 'energy' or implicitly B
      if (item.energy === '0.05-0.4nm' || item.energy_band === '0.05-0.4nm') {
        groups[t].xrsa = val;
      } else if (item.energy === '0.1-0.8nm' || item.energy_band === '0.1-0.8nm') {
        groups[t].xrsb = val;
      } else {
        // If no explicit energy band, assume it's pre-separated or it's just xrsb
        if (fieldMap.fluxBKey && item[fieldMap.fluxBKey] !== undefined) {
          groups[t].xrsb = Math.max(1e-9, item[fieldMap.fluxBKey]);
        }
        if (fieldMap.fluxAKey && item[fieldMap.fluxAKey] !== undefined) {
          groups[t].xrsa = Math.max(1e-9, item[fieldMap.fluxAKey]);
        }
      }
    });

    const sorted = Object.values(groups).sort((a, b) => a.time - b.time);

    // Inject Demo M5.2 flare
    if (demoActive && sorted.length > 0) {
      const len = sorted.length;
      for (let i = 0; i < 20; i++) {
        const idx = len - 20 + i;
        if (idx >= 0 && idx < len) {
          const dist = i - 12;
          const flareB = 5.2e-5 * Math.exp(-dist * dist / 18);
          const flareA = 1.8e-5 * Math.exp(-dist * dist / 14);
          sorted[idx].xrsb = Math.max(sorted[idx].xrsb, flareB);
          sorted[idx].xrsa = Math.max(sorted[idx].xrsa, flareA);
        }
      }
    }

    const latestTime = sorted.length > 0 ? sorted[sorted.length - 1].time : Date.now();
    const threeHoursAgo = latestTime - 3 * 3600 * 1000;
    return sorted.filter(s => s.time >= threeHoursAgo);
  }, [goesData, demoActive, fieldMap]);

  const getFlareClass = (flux) => {
    if (flux >= 1e-4) return `X${(flux / 1e-4).toFixed(1)}`;
    if (flux >= 1e-5) return `M${(flux / 1e-5).toFixed(1)}`;
    if (flux >= 1e-6) return `C${(flux / 1e-6).toFixed(1)}`;
    if (flux >= 1e-7) return `B${(flux / 1e-7).toFixed(1)}`;
    return 'A';
  };

  const getFlareColor = (flux) => {
    if (flux >= 1e-4) return '#FF3B3B';
    if (flux >= 1e-5) return '#FFB347';
    if (flux >= 1e-6) return '#4FC3F7';
    return '#8FA3C0';
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const classStr = getFlareClass(data.xrsb);
      return (
        <div className="bg-[#020B18] border border-border-subtle p-3 rounded-sm font-mono text-[10px] shadow-lg flex flex-col gap-1.5">
          <div className="text-text-secondary">UTC: {new Date(data.time).toISOString().replace('T', ' ').substring(0, 19)}</div>
          <div className="flex justify-between gap-4">
            <span className="text-[#FFB347]">XRS-B (0.1-0.8nm):</span>
            <span className="font-bold">{data.xrsb.toExponential(2)} W/m²</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#4FC3F7]">XRS-A (0.05-0.4nm):</span>
            <span className="font-bold">{data.xrsa.toExponential(2)} W/m²</span>
          </div>
          <div className="border-t border-border-subtle/50 pt-1.5 mt-1.5 flex justify-between">
            <span className="text-text-secondary">Current Class:</span>
            <span className="text-accent-orange font-bold">{classStr}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const timeSinceSeconds = lastUpdate ? Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 1000) : 0;
  
  const currentFlux = parsedData.length > 0 ? parsedData[parsedData.length - 1].xrsb : 1e-9;
  const currentClass = getFlareClass(currentFlux);
  const currentColor = getFlareColor(currentFlux);

  return (
    <Card className="flex-1 flex flex-col h-full" p={0}>
      {/* Header */}
      <div className="px-4 py-2.5 border-b-[0.5px] border-border-subtle bg-[#020B18] flex items-center justify-between shrink-0">
        <div className="font-mono text-[10px] text-text-primary uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
          <span>GOES-18 LIVE X-RAY FLUX · LAST 3H</span>
        </div>
        <div className="font-mono text-[9px] text-text-secondary flex items-center gap-1.5">
          <span className={timeSinceSeconds > 300 ? "text-[#FF3B3B]" : timeSinceSeconds > 90 ? "text-[#FFB347]" : "text-[#00E5A0]"}>
            {timeSinceSeconds}s ago
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 w-full p-2 flex flex-col relative h-full min-h-0">
        {!fieldMap || goesData.length === 0 ? (
          <div className="flex-1 shimmer-panel flex items-center justify-center">
            <span className="font-mono text-[10px] text-text-secondary font-bold tracking-widest relative z-10">
              ACQUIRING GOES-18 TELEMETRY...
            </span>
          </div>
        ) : parsedData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#020B18]">
            <span className="font-mono text-[10px] text-[#FF3B3B] font-bold tracking-widest border border-[#FF3B3B]/50 p-2">
              NO FLUX DATA IN RANGE — GOES-18 OFFLINE?
            </span>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={parsedData} margin={{ top: 15, right: 45, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,107,0,0.15)" />
                  <XAxis 
                    dataKey="time_tag"
                    tickFormatter={(t) => new Date(t).toUTCString().slice(17,22)}
                    stroke="#8FA3C0"
                    fontSize={8}
                    fontFamily="monospace"
                  />
                  <YAxis 
                    scale="log"
                    domain={[1e-9, 1e-3]}
                    allowDataOverflow={true}
                    ticks={[1e-9, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3]}
                    tickFormatter={(v) => { const exp = Math.round(Math.log10(v)); return `1e${exp}`; }}
                    stroke="#8FA3C0"
                    fontSize={8}
                    fontFamily="monospace"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Shaded Areas */}
                  <ReferenceArea y1={1e-5} y2={1e-4} fill="rgba(255,107,0,0.06)" isFront={false} />
                  <ReferenceArea y1={1e-4} y2={1e-3} fill="rgba(255,59,59,0.08)" isFront={false} />

                  {/* Threshold Lines */}
                  <ReferenceLine y={1e-7} stroke="#2E3D52" strokeDasharray="2 2" label={{ value: 'B', fill: '#8FA3C0', position: 'right', fontSize: 8, fontFamily: 'monospace' }} />
                  <ReferenceLine y={1e-6} stroke="#4FC3F7" strokeDasharray="3 3" label={{ value: 'C', fill: '#4FC3F7', position: 'right', fontSize: 8, fontFamily: 'monospace' }} />
                  <ReferenceLine y={1e-5} stroke="#FFB347" strokeDasharray="3 3" label={{ value: 'M', fill: '#FFB347', position: 'right', fontSize: 8, fontFamily: 'monospace' }} />
                  <ReferenceLine y={1e-4} stroke="#FF3B3B" strokeDasharray="3 3" label={{ value: 'X', fill: '#FF3B3B', position: 'right', fontSize: 8, fontFamily: 'monospace' }} />

                  <Line type="monotone" dataKey="xrsb" stroke="#FFB347" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="xrsa" stroke="#4FC3F7" strokeWidth={1} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Current Status Footer */}
            <div className="mt-2 text-center border-t border-border-subtle/50 pt-2 shrink-0">
              <span className="font-mono text-[11px]" style={{ color: currentColor }}>
                Current: XRS-B {currentFlux.toExponential(2)} W/m² · Class {currentClass} · Updated {timeSinceSeconds}s ago
              </span>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
