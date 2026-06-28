import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Card } from '../ui/Card';
import useMLStore from '../../store/useMLStore';
import { useGSAPEntrance } from '../../hooks/useGSAPEntrance';

export function DualPayloadChart() {
  const solexsLive = useMLStore(state => state.solexsLive);
  const heliosLive = useMLStore(state => state.heliosLive);
  const neupertResult = useMLStore(state => state.neupertResult);
  
  const containerRef = useGSAPEntrance({ y: 30, duration: 0.8 });

  const chartData = useMemo(() => {
    const combined = [];
    const minLen = Math.min(solexsLive.length, heliosLive.length);
    for (let i = 0; i < minLen; i++) {
      const s = solexsLive[i];
      const h = heliosLive[i];
      
      const t = new Date(s.time_tag).getTime();
      
      combined.push({
        time: t,
        formattedTime: new Date(t).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        softXray: s.flux,
        hardXray: h.counts_per_sec
      });
    }
    return combined;
  }, [solexsLive, heliosLive]);

  // Determine the reference line X-coordinate for Neupert Effect
  let neupertPoint = null;
  if (neupertResult?.confirmed && chartData.length > 0) {
    const latestTime = chartData[chartData.length - 1].time;
    const targetTime = latestTime - (neupertResult.lead_mins * 60000);
    
    // Find closest data point to the lead time
    let closest = chartData[0];
    let minDiff = Math.abs(closest.time - targetTime);
    for (let p of chartData) {
      const diff = Math.abs(p.time - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }
    neupertPoint = closest.formattedTime;
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length >= 2) {
      const helios = payload.find(p => p.dataKey === 'hardXray')?.value;
      const solexs = payload.find(p => p.dataKey === 'softXray')?.value;
      
      return (
        <div className="bg-[#020B18] border border-border-subtle p-3 rounded-sm font-mono text-[10px] shadow-lg flex flex-col gap-1.5">
          <div className="text-text-secondary border-b-[0.5px] border-border-subtle/50 pb-1.5">{label}</div>
          <div className="flex justify-between gap-4">
            <span className="text-[#FFB347]">HEL1OS (Hard X-ray):</span>
            <span className="font-bold">{helios?.toFixed(1)} counts/s</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#4FC3F7]">SoLEXS (Soft X-ray):</span>
            <span className="font-bold">{solexs?.toExponential(2)} W/m²</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col h-full">
      <Card className="flex-1 flex flex-col h-full" p={0}>
        <div className="px-4 py-2.5 border-b-[0.5px] border-border-subtle bg-[#020B18] flex items-center justify-between shrink-0">
          <div className="font-mono text-[10px] text-text-primary uppercase tracking-widest flex items-center gap-2">
            <span>ADITYA-L1 DUAL PAYLOAD · REALTIME STREAM</span>
          </div>
          <div className="font-mono text-[9px] text-text-secondary flex gap-3 items-center">
            {neupertResult?.confirmed && (
              <span className="text-[#FFB347]">NEUPERT EFFECT DETECTED</span>
            )}
            <span>LIVE</span>
          </div>
        </div>

        <div className="flex-1 w-full p-2 h-full relative">
          {chartData.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-text-secondary">
              WAITING FOR TELEMETRY...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,107,0,0.15)" />
                <XAxis 
                  dataKey="formattedTime" 
                  stroke="#8FA3C0" 
                  fontSize={9}
                  minTickGap={30}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#FFB347" 
                  fontSize={9}
                  tickFormatter={(v) => v > 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(0)}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  scale="log"
                  domain={[1e-9, 1e-3]}
                  stroke="#4FC3F7" 
                  fontSize={9}
                  tickFormatter={(v) => v.toExponential(0)}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {neupertPoint && (
                  <ReferenceLine 
                    x={neupertPoint} 
                    stroke="#FFB347" 
                    strokeDasharray="3 3" 
                    yAxisId="left" 
                    label={{ value: `NEUPERT T-${neupertResult.lead_mins}m`, fill: '#FFB347', position: 'top', fontSize: 9 }} 
                  />
                )}

                <Line 
                  isAnimationActive={false}
                  yAxisId="left"
                  type="monotone" 
                  dataKey="hardXray" 
                  stroke="#FFB347" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  isAnimationActive={false}
                  yAxisId="right"
                  type="monotone" 
                  dataKey="softXray" 
                  stroke="#4FC3F7" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
