import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Card } from '../ui/Card';
import { gannonStormData } from '../../data/gannonStorm';

export function DualPayloadChart() {
  const chartData = useMemo(() => {
    const combined = [];
    const minLen = Math.min(gannonStormData.solexs.length, gannonStormData.helios.length);
    for (let i = 0; i < minLen; i++) {
      const s = gannonStormData.solexs[i];
      const h = gannonStormData.helios[i];
      
      const t = new Date(s.time_tag).getTime();
      const pt = new Date(gannonStormData.peakTime).getTime();
      const offsetMins = (t - pt) / 60000;
      
      combined.push({
        time: t,
        offset: Math.round(offsetMins),
        softXray: s.flux,
        hardXray: h.counts_per_sec
      });
    }
    return combined;
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length >= 2) {
      const helios = payload.find(p => p.dataKey === 'hardXray')?.value;
      const solexs = payload.find(p => p.dataKey === 'softXray')?.value;
      
      return (
        <div className="bg-[#020B18] border border-border-subtle p-3 rounded-sm font-mono text-[10px] shadow-lg flex flex-col gap-1.5">
          <div className="text-text-secondary border-b-[0.5px] border-border-subtle/50 pb-1.5">T{label < 0 ? label : `+${label}`} mins</div>
          <div className="flex justify-between gap-4">
            <span className="text-[#FFB347]">HEL1OS (Hard X-ray):</span>
            <span className="font-bold">{helios?.toFixed(1)}k counts/s</span>
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
    <Card className="flex-1 flex flex-col h-full" p={0}>
      <div className="px-4 py-2.5 border-b-[0.5px] border-border-subtle bg-[#020B18] flex items-center justify-between shrink-0">
        <div className="font-mono text-[10px] text-text-primary uppercase tracking-widest flex items-center gap-2">
          <span>ADITYA-L1 DUAL PAYLOAD · GANNON STORM</span>
        </div>
        <div className="font-mono text-[9px] text-text-secondary">
          PRE-PROCESSED · MAY 2024
        </div>
      </div>

      <div className="flex-1 w-full p-2 h-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,107,0,0.15)" />
            <XAxis 
              dataKey="offset" 
              stroke="#8FA3C0" 
              fontSize={9}
              tickFormatter={(v) => `T${v > 0 ? '+' : ''}${v}m`}
            />
            <YAxis 
              yAxisId="left"
              stroke="#FFB347" 
              fontSize={9}
              tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
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
            
            <ReferenceLine x={-3} stroke="#FFB347" strokeDasharray="3 3" yAxisId="left" label={{ value: 'IMPULSIVE PEAK (T-3m)', fill: '#FFB347', position: 'top', fontSize: 9 }} />
            <ReferenceLine x={0} stroke="#4FC3F7" strokeDasharray="3 3" yAxisId="left" label={{ value: 'GRADUAL PEAK (T+0)', fill: '#4FC3F7', position: 'top', fontSize: 9 }} />

            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="hardXray" 
              stroke="#FFB347" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="softXray" 
              stroke="#4FC3F7" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
