import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea } from 'recharts';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';
import useMLStore from '../../store/useMLStore';
import gsap from '../../animations/gsap.config';

export function LiveFluxChart({ showForecast = false }) {
  const { goesData, demoActive, lastUpdate } = useStore();
  const mlForecast = useMLStore(state => state.mlForecast);
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
      
      if (item.energy === '0.05-0.4nm' || item.energy_band === '0.05-0.4nm') {
        groups[t].xrsa = val;
      } else if (item.energy === '0.1-0.8nm' || item.energy_band === '0.1-0.8nm') {
        groups[t].xrsb = val;
      } else {
        if (fieldMap.fluxBKey && item[fieldMap.fluxBKey] !== undefined) {
          groups[t].xrsb = Math.max(1e-9, item[fieldMap.fluxBKey]);
        }
        if (fieldMap.fluxAKey && item[fieldMap.fluxAKey] !== undefined) {
          groups[t].xrsa = Math.max(1e-9, item[fieldMap.fluxAKey]);
        }
      }
    });

    const sorted = Object.values(groups).sort((a, b) => a.time - b.time);

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

  const combinedData = useMemo(() => {
    const base = [...parsedData];
    if (showForecast && mlForecast?.flux_trajectory && base.length > 0) {
      const lastPoint = base[base.length - 1];
      
      // Mutate lastPoint to connect the lines
      lastPoint.forecastXrsb = lastPoint.xrsb;
      lastPoint.forecastRange = [lastPoint.xrsb, lastPoint.xrsb];

      const traj = mlForecast.flux_trajectory.map(d => {
         const f = Math.max(1e-9, d.flux);
         const low = f / Math.pow(10, 0.3);
         const high = f * Math.pow(10, 0.3);
         return {
           time: new Date(d.time_tag).getTime(),
           time_tag: d.time_tag,
           forecastXrsb: f,
           forecastRange: [low, high]
         };
      });
      return [...base, ...traj].sort((a, b) => a.time - b.time);
    }
    return base;
  }, [parsedData, showForecast, mlForecast]);

  const chartRef = useRef(null);
  
  useEffect(() => {
    if (showForecast && chartRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Find the forecast line path
      const paths = chartRef.current.querySelectorAll('.forecast-line path.recharts-curve.recharts-line-curve');
      paths.forEach(path => {
        const length = path.getTotalLength();
        // Since we want it dashed (5 5), animating dashoffset normally erases the dash pattern.
        // We'll animate opacity as a fallback or just use a clipPath in real SVG. 
        // For GSAP stroke reveal of a dashed line, we can wrap it in a custom animation:
        gsap.fromTo(path,
          { strokeDasharray: `${length} ${length}`, strokeDashoffset: length },
          { strokeDashoffset: 0, duration: 1.5, ease: 'power2.out', onComplete: () => {
            // Restore dash pattern
            path.setAttribute('stroke-dasharray', '5 5');
          }}
        );
      });
    }
  }, [combinedData, showForecast]);

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
      const classStr = getFlareClass(data.xrsb || data.forecastXrsb);
      return (
        <div className="bg-[#020B18] border border-border-subtle p-3 rounded-sm font-mono text-[10px] shadow-lg flex flex-col gap-1.5">
          <div className="text-text-secondary">UTC: {new Date(data.time).toISOString().replace('T', ' ').substring(0, 19)}</div>
          {data.xrsb && (
            <div className="flex justify-between gap-4">
              <span className="text-[#FFB347]">XRS-B (0.1-0.8nm):</span>
              <span className="font-bold">{data.xrsb.toExponential(2)} W/m²</span>
            </div>
          )}
          {data.xrsa && (
            <div className="flex justify-between gap-4">
              <span className="text-[#4FC3F7]">XRS-A (0.05-0.4nm):</span>
              <span className="font-bold">{data.xrsa.toExponential(2)} W/m²</span>
            </div>
          )}
          {data.forecastXrsb && (
            <div className="flex justify-between gap-4">
              <span className="text-[#FFB347] opacity-80">Forecast XRS-B:</span>
              <span className="font-bold">{data.forecastXrsb.toExponential(2)} W/m²</span>
            </div>
          )}
          <div className="border-t border-border-subtle/50 pt-1.5 mt-1.5 flex justify-between">
            <span className="text-text-secondary">Predicted Class:</span>
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
      <div className="px-4 py-2.5 border-b-[0.5px] border-border-subtle bg-[#020B18] flex items-center justify-between shrink-0">
        <div className="font-mono text-[10px] text-text-primary uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
          <span>GOES-18 LIVE X-RAY FLUX {showForecast && " + XGBOOST TRAJECTORY"}</span>
        </div>
        <div className="font-mono text-[9px] text-text-secondary flex items-center gap-1.5">
          <span className={timeSinceSeconds > 300 ? "text-[#FF3B3B]" : timeSinceSeconds > 90 ? "text-[#FFB347]" : "text-[#00E5A0]"}>
            {timeSinceSeconds}s ago
          </span>
        </div>
      </div>

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
            <div className="flex-1 min-h-0" ref={chartRef}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={combinedData} margin={{ top: 15, right: 45, left: -20, bottom: 0 }}>
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
                  
                  <ReferenceArea y1={1e-5} y2={1e-4} fill="rgba(255,107,0,0.06)" isFront={false} />
                  <ReferenceArea y1={1e-4} y2={1e-3} fill="rgba(255,59,59,0.08)" isFront={false} />

                  <ReferenceLine y={1e-7} stroke="#2E3D52" strokeDasharray="2 2" label={{ value: 'B', fill: '#8FA3C0', position: 'right', fontSize: 8, fontFamily: 'monospace' }} />
                  <ReferenceLine y={1e-6} stroke="#4FC3F7" strokeDasharray="3 3" label={{ value: 'C', fill: '#4FC3F7', position: 'right', fontSize: 8, fontFamily: 'monospace' }} />
                  <ReferenceLine y={1e-5} stroke="#FFB347" strokeDasharray="3 3" label={{ value: 'M', fill: '#FFB347', position: 'right', fontSize: 8, fontFamily: 'monospace' }} />
                  <ReferenceLine y={1e-4} stroke="#FF3B3B" strokeDasharray="3 3" label={{ value: 'X', fill: '#FF3B3B', position: 'right', fontSize: 8, fontFamily: 'monospace' }} />

                  {showForecast && parsedData.length > 0 && (
                    <ReferenceLine 
                      x={parsedData[parsedData.length - 1].time_tag} 
                      stroke="#00E5A0" 
                      strokeDasharray="4 4"
                      label={{ value: 'NOW', fill: '#00E5A0', position: 'top', fontSize: 10, fontFamily: 'monospace' }} 
                    />
                  )}

                  {showForecast && (
                    <Area type="monotone" dataKey="forecastRange" stroke="none" fill="rgba(255,179,71,0.15)" isAnimationActive={false} />
                  )}

                  <Line type="monotone" dataKey="xrsb" stroke="#FFB347" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="xrsa" stroke="#4FC3F7" strokeWidth={1} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
                  
                  {showForecast && (
                    <Line className="forecast-line" type="monotone" dataKey="forecastXrsb" stroke="#FFB347" strokeDasharray="5 5" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            
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
