import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getGoesRealtime } from '../../services/api';
import { format, parseISO } from 'date-fns';
import { Card } from '../ui/Card';

export function XrayFluxChart() {
  const { data: realtimeData, isLoading, isError } = useQuery({
    queryKey: ['goesRealtime'],
    queryFn: getGoesRealtime,
    refetchInterval: 60000, // 60s
  });

  const chartData = useMemo(() => {
    if (!realtimeData) return [];
    
    // Group by time_tag
    const timeMap = new Map();
    realtimeData.forEach(item => {
      if (!item || !item.time_tag) return;
      const time = item.time_tag;
      if (!timeMap.has(time)) {
        try {
          timeMap.set(time, { 
            time: new Date(time).getTime(), 
            displayTime: format(parseISO(time), 'HH:mm'),
            channelA: 1e-9,
            channelB: 1e-9
          });
        } catch (e) {
          // Ignore invalid dates
          return;
        }
      }
      
      const entry = timeMap.get(time);
      if (!entry) return;
      
      // Clamp flux to > 0 for log scale (NOAA sometimes uses negative values for missing data)
      const clampedFlux = Math.max(1e-9, item.flux || 1e-9);
      
      if (item.energy === '0.05-0.4nm') {
        entry.channelA = clampedFlux; // Blue line
      } else if (item.energy === '0.1-0.8nm') {
        entry.channelB = clampedFlux; // Amber line
      }
    });
    
    return Array.from(timeMap.values()).sort((a, b) => a.time - b.time);
  }, [realtimeData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background-tertiary border border-border-emphasis p-2 rounded shadow-lg">
          <p className="text-text-primary font-mono text-xs mb-1">{label} UTC</p>
          {payload.map((entry, index) => {
            const val = Number(entry.value) || 0;
            return (
              <p key={index} className="font-mono text-[10px]" style={{ color: entry.color }}>
                {entry.name}: {val.toExponential(2)} W/m²
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <Card title="GOES X-Ray Flux (Real-time)" className="flex-1 flex flex-col min-h-[300px]" withScanLine>
       <div className="flex justify-end gap-4 mb-2 pr-4">
         <div className="flex items-center gap-2">
           <div className="w-3 h-[2px] bg-[#4FC3F7]" />
           <span className="font-mono text-[10px] text-text-secondary">0.05-0.4nm</span>
         </div>
         <div className="flex items-center gap-2">
           <div className="w-3 h-[2px] bg-accent-amber" />
           <span className="font-mono text-[10px] text-text-secondary">0.1-0.8nm</span>
         </div>
       </div>
       <div className="flex-1 w-full relative min-h-[250px]">
         {isLoading && (
           <div className="absolute inset-0 flex items-center justify-center text-text-secondary font-mono text-xs z-10">
             LOADING TELEMETRY...
           </div>
         )}
         {isError && (
           <div className="absolute inset-0 flex items-center justify-center text-accent-red font-mono text-xs z-10">
             ERROR FETCHING TELEMETRY
           </div>
         )}
         
         <ResponsiveContainer width="100%" height="100%">
           <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
             <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,107,0,0.08)" vertical={false} />
             <XAxis 
               dataKey="displayTime" 
               stroke="#8FA3C0"
               tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
               axisLine={{ stroke: 'rgba(255,107,0,0.15)' }}
               tickLine={false}
               minTickGap={30}
             />
             <YAxis 
               scale="log" 
               domain={[1e-9, 1e-3]} 
               stroke="#8FA3C0"
               tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
               tickFormatter={(val) => val.toExponential(0)}
               axisLine={false}
               tickLine={false}
             />
             <Tooltip content={<CustomTooltip />} />
             
             {/* Threshold Lines */}
             <ReferenceLine y={1e-4} stroke="#FF3B3B" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'X', fill: '#FF3B3B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
             <ReferenceLine y={1e-5} stroke="#FFB347" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'M', fill: '#FFB347', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
             <ReferenceLine y={1e-6} stroke="#4FC3F7" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'C', fill: '#4FC3F7', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
             
             <Line type="monotone" dataKey="channelA" name="0.05-0.4nm" stroke="#4FC3F7" strokeWidth={1.5} dot={false} />
             <Line type="monotone" dataKey="channelB" name="0.1-0.8nm" stroke="#FFB347" strokeWidth={1.5} dot={false} />
           </LineChart>
         </ResponsiveContainer>
       </div>
    </Card>
  );
}
