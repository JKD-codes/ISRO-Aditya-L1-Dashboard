import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSolarCycle } from '../../services/api';
import { Card } from '../ui/Card';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, ReferenceLine } from 'recharts';

export function SolarCycleContext() {
  const { data: cycleData, isLoading } = useQuery({
    queryKey: ['solarCycle'],
    queryFn: getSolarCycle,
    refetchInterval: 86400000, // 24 hours
  });

  const parsedData = useMemo(() => {
    if (!Array.isArray(cycleData) || cycleData.length === 0) return [];
    
    // Filter from 2019 onwards
    const filtered = cycleData.filter(d => {
      const tag = d['time-tag'] || '';
      const year = parseInt(tag.split('-')[0]);
      return year >= 2019 && year <= 2026;
    });

    // Sample data to make it fit nicely (e.g., every 2nd month)
    const sampled = [];
    for (let i = 0; i < filtered.length; i += 2) {
      const item = filtered[i];
      const ssn = item.ssn || item.smoothed_ssn || 0;
      const tag = item['time-tag'] || '';
      const year = tag.split('-')[0];
      
      sampled.push({
        timeTag: tag,
        year: year,
        ssn: Math.max(1, ssn),
        timeMs: new Date(tag + '-15').getTime()
      });
    }
    return sampled;
  }, [cycleData]);

  // Find index of current month and Oct 2024 peak
  const nowTimeMs = useMemo(() => new Date('2026-06-15').getTime(), []);
  const peakTimeMs = useMemo(() => new Date('2024-10-15').getTime(), []);

  const getColor = (ssn) => {
    if (ssn >= 120) return '#FF3B3B'; // High -> Red
    if (ssn >= 50) return '#FFB347';  // Med -> Amber
    return '#4FC3F7';                 // Low -> Blue
  };

  return (
    <Card title="SOLAR CYCLE 25 CONTEXT" className="w-full h-[120px]" p={0}>
      <div className="h-full flex flex-col md:flex-row items-center gap-4 px-4 py-2">
        {/* Info Callout */}
        <div className="w-full md:w-1/3 flex flex-col gap-0.5 justify-center">
          <span className="font-display font-semibold text-[11px] text-text-primary tracking-wide">
            SC25 peaked Oct 2024
          </span>
          <p className="text-[10px] text-text-secondary leading-tight font-sans">
            Currently descending · Still elevated flare risk. Solar Cycle 25 has exceeded initial prediction models.
          </p>
        </div>

        {/* Chart */}
        <div className="flex-1 w-full h-[75px] relative">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center font-mono text-[9px] text-text-secondary">
              LOADING CONTEXT DATA...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={parsedData} margin={{ top: 5, right: 10, left: -30, bottom: -5 }}>
                <XAxis 
                  dataKey="year" 
                  stroke="#8FA3C0"
                  fontSize={7}
                  fontFamily="monospace"
                  tickLine={false}
                  axisLine={false}
                  // Avoid labels clutter by rendering once per year
                  interval="preserveStartEnd"
                />
                <YAxis hide domain={[0, 220]} />
                
                {/* Dashed line at peak (Oct 2024) */}
                <ReferenceLine 
                  x="2024"
                  stroke="#FF3B3B" 
                  strokeDasharray="2 2"
                  label={{ value: 'PEAK SC25 (OCT 2024)', fill: '#FF3B3B', fontSize: 7, fontFamily: 'monospace', position: 'top' }}
                />

                {/* Dashed line at Now (June 2026) */}
                <ReferenceLine 
                  x="2026"
                  stroke="#FFB347" 
                  strokeDasharray="2 2"
                  label={{ value: 'NOW', fill: '#FFB347', fontSize: 7, fontFamily: 'monospace', position: 'top' }}
                />

                <Bar dataKey="ssn" radius={[1, 1, 0, 0]} barSize={2}>
                  {parsedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(entry.ssn)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Card>
  );
}
