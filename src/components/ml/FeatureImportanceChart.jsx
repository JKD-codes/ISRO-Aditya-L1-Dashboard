import React, { useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import gsap from '../../animations/gsap.config';

export function FeatureImportanceChart({ data }) {
  const chartRef = useRef(null);

  const formattedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(item => {
      const name = item.feature.toLowerCase();
      let category = 'context';
      let color = '#00E5A0'; // context -> green
      
      if (name.includes('flux') || name.includes('x-ray') || name.includes('xray') || name.includes('hxr') || name.includes('ratio')) {
        category = 'flux';
        color = '#FFB347'; // flux -> orange
      } else if (name.includes('ar ') || name.includes('area') || name.includes('magnetic') || name.includes('sunspot') || name === 'ar') {
        category = 'ar';
        color = '#4FC3F7'; // AR -> blue
      }

      return {
        ...item,
        category,
        color
      };
    }).sort((a, b) => a.value - b.value);
  }, [data]);

  useEffect(() => {
    if (chartRef.current && formattedData.length > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // GSAP stagger for the bars
      const bars = chartRef.current.querySelectorAll('.recharts-bar-rectangle');
      if (bars.length > 0) {
        gsap.fromTo(bars, 
          { scaleX: 0, transformOrigin: 'left center' },
          { scaleX: 1, duration: 0.8, stagger: 0.1, ease: 'power2.out', delay: 0.3 }
        );
      }
    }
  }, [formattedData]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#020B18] border border-border-subtle p-2 font-mono text-[10px] shadow-lg">
          <div className="text-text-primary font-bold mb-1">{data.feature}</div>
          <div style={{ color: data.color }}>
            Importance: {data.value.toFixed(4)}
          </div>
          <div className="text-text-secondary mt-1 uppercase text-[8px]">
            Category: {data.category}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full" ref={chartRef}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={formattedData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
          <XAxis type="number" stroke="#8FA3C0" fontSize={10} hide />
          <YAxis 
            type="category" 
            dataKey="feature" 
            stroke="#8FA3C0" 
            fontSize={9} 
            fontFamily="monospace"
            tick={{ fill: '#8FA3C0' }} 
            width={140}
            axisLine={false}
            tickLine={false}
          />
          <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
