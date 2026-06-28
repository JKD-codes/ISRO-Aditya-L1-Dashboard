import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { AlertHistoryLog } from '../components/dashboard/AlertHistoryLog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import useMLStore from '../store/useMLStore';
import gsap from '../animations/gsap.config';
import { useGSAP } from '@gsap/react';

export default function AlertHistoryPage() {
  const [filterClass, setFilterClass] = useState('ALL');
  const { alertHistory } = useMLStore();
  const containerRef = React.useRef(null);

  useGSAP(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo('.history-card',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power2.out' }
      );
    }
  }, { scope: containerRef });

  const chartData = useMemo(() => {
    const counts = { B: 0, C: 0, M: 0, X: 0 };
    alertHistory.forEach(alert => {
      if (alert.flareClass.startsWith('X')) counts.X++;
      else if (alert.flareClass.startsWith('M')) counts.M++;
      else if (alert.flareClass.startsWith('C')) counts.C++;
      else if (alert.flareClass.startsWith('B')) counts.B++;
    });
    return [
      { name: 'B-CLASS', count: counts.B, color: '#8FA3C0' },
      { name: 'C-CLASS', count: counts.C, color: '#FDE047' },
      { name: 'M-CLASS', count: counts.M, color: '#FFB347' },
      { name: 'X-CLASS', count: counts.X, color: '#FF3B3B' },
    ];
  }, [alertHistory]);

  const FilterButton = ({ label, value }) => {
    const active = filterClass === value;
    return (
      <button 
        onClick={() => setFilterClass(value)}
        className={`px-4 py-1.5 font-mono text-xs font-bold rounded-sm border transition-colors ${
          active 
            ? 'bg-accent-orange/20 border-accent-orange text-accent-orange' 
            : 'bg-white/5 border-border-subtle text-text-secondary hover:bg-white/10 hover:text-white'
        }`}
      >
        {label}
      </button>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#020B18] border border-border-subtle p-2 font-mono text-[10px]">
          <span style={{ color: payload[0].payload.color }}>
            {payload[0].payload.name}: {payload[0].value} EVENTS
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 space-y-4" ref={containerRef}>
      <div className="history-card">
        <Card className="flex flex-col mb-4 p-4" p={0}>
          <div className="flex gap-2">
            <FilterButton label="ALL ALERTS" value="ALL" />
            <FilterButton label="B-CLASS" value="B" />
            <FilterButton label="C-CLASS" value="C" />
            <FilterButton label="M-CLASS" value="M" />
            <FilterButton label="X-CLASS" value="X" />
          </div>
        </Card>
      </div>

      <div className="history-card h-[400px]">
        <AlertHistoryLog filterClass={filterClass} />
      </div>

      <div className="history-card h-[250px]">
        <Card className="h-full flex flex-col" p={0} title="FLARE DISTRIBUTION (SESSION)">
          <div className="flex-1 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#555" 
                  tick={{ fill: '#8FA3C0', fontSize: 10, fontFamily: 'monospace' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#555" 
                  tick={{ fill: '#8FA3C0', fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
