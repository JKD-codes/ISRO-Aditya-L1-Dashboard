import React, { useMemo } from 'react';
import { Card } from '../ui/Card';
import useMLStore from '../../store/useMLStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export function SpectralHardnessChart() {
  const { solexsLive, heliosLive } = useMLStore();

  const data = useMemo(() => {
    if (!solexsLive?.length || !heliosLive?.length) return [];
    
    // Match by time (assuming aligned or close enough for demo)
    const result = [];
    const minLen = Math.min(solexsLive.length, heliosLive.length);
    
    for (let i = 0; i < minLen; i++) {
      const s = solexsLive[i];
      const h = heliosLive[i];
      
      const softFlux = Math.max(1e-9, s.flux || 1e-9);
      const hardCounts = Math.max(1, h.counts || 1);
      
      const ratio = softFlux / hardCounts;
      const logRatio = Math.log10(ratio);
      
      let isDrop = false;
      if (i > 0) {
        const prevRatio = result[i-1].logRatio;
        // Sharply drops if it goes down by more than 0.5 log units
        if (logRatio - prevRatio < -0.3) {
          isDrop = true;
        }
      }
      
      result.push({
        time_tag: s.time_tag,
        logRatio,
        isDrop
      });
    }
    
    return result.slice(-30); // Show last 30 points
  }, [solexsLive, heliosLive]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#020B18] border border-border-subtle p-2 font-mono text-[10px] shadow-lg">
          <div className="text-text-secondary">{new Date(data.time_tag).toLocaleTimeString()}</div>
          <div className="text-[#00E5A0] mt-1">
            log(Soft/Hard): <span className="font-bold">{data.logRatio.toFixed(2)}</span>
          </div>
          {data.isDrop && (
            <div className="text-[#FF3B3B] font-bold mt-1">IMPULSIVE PHASE ONSET!</div>
          )}
        </div>
      );
    }
    return null;
  };

  const bgRatio = -6.5; // Example background ratio line

  return (
    <Card className="h-48 flex flex-col" p={0} title="SPECTRAL HARDNESS RATIO">
      <div className="flex-1 p-2 relative h-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-text-secondary font-mono text-[10px]">
            WAITING FOR DUAL PAYLOAD DATA...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time_tag" hide />
              <YAxis domain={[-10, -4]} stroke="#8FA3C0" fontSize={9} fontFamily="monospace" tickCount={5} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              
              <ReferenceLine y={bgRatio} stroke="#8FA3C0" strokeDasharray="3 3" opacity={0.5} />
              
              <defs>
                <linearGradient id="ratioGrad" x1="0" y1="0" x2="1" y2="0">
                  {data.map((d, i) => (
                    <stop 
                      key={i} 
                      offset={`${(i / (data.length - 1)) * 100}%`} 
                      stopColor={d.isDrop ? '#FF3B3B' : '#00E5A0'} 
                    />
                  ))}
                </linearGradient>
              </defs>
              
              <Line 
                type="monotone" 
                dataKey="logRatio" 
                stroke="url(#ratioGrad)" 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        
        {/* Annotation */}
        <div className="absolute bottom-2 left-10 font-mono text-[9px] text-[#FFB347]">
          RATIO DROP = IMPULSIVE PHASE ONSET
        </div>
      </div>
    </Card>
  );
}
