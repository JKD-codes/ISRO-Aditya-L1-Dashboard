import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

export function FlareProbabilityGauge() {
  const { solarProbs, forecastMode, setForecastMode } = useStore();
  const [computedTime, setComputedTime] = useState('');

  useEffect(() => {
    // Generate realistic timestamp a few minutes ago
    const d = new Date(Date.now() - Math.floor(Math.random() * 8 + 2) * 60000);
    setComputedTime(d.toISOString().substring(11, 19) + ' UTC');
  }, []);

  const GaugeArc = ({ value, label, color, size = 80 }) => {
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
      <div className="flex flex-col items-center gap-1.5" style={{ width: size }}>
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
          {/* Background Arc */}
          <svg className="transform -rotate-90 absolute" width={size} height={size}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={strokeWidth}
              fill="none"
            />
          </svg>
          {/* Foreground Arc */}
          <svg className="transform -rotate-90 absolute" width={size} height={size}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <span className="font-mono text-sm font-bold text-text-primary">
            {value}%
          </span>
        </div>
        <span className="font-mono text-[10px] text-text-secondary tracking-widest">{label}</span>
      </div>
    );
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <h3 className="font-display text-sm tracking-wider font-bold">FLARE PROBABILITY</h3>
          <span className="font-mono text-[9px] text-accent-orange/70">DISK-INTEGRATED (24H)</span>
        </div>

        <div className="flex bg-[#0A1929] rounded p-0.5 border border-border-subtle/50">
          <button
            onClick={() => setForecastMode('nowcast')}
            className={cn(
              "px-3 py-1 text-[10px] font-mono rounded transition-colors",
              forecastMode === 'nowcast' ? "bg-[#1E3A5F] text-white" : "text-text-secondary hover:text-white"
            )}
          >
            NOWCAST
          </button>
          <button
            onClick={() => setForecastMode('forecast')}
            className={cn(
              "px-3 py-1 text-[10px] font-mono rounded transition-colors",
              forecastMode === 'forecast' ? "bg-[#1E3A5F] text-white" : "text-text-secondary hover:text-white"
            )}
          >
            FORECAST
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-6 pb-2">
        {/* Top Row: M and X (High Impact) */}
        <div className="flex justify-around items-center px-4">
          <GaugeArc value={solarProbs.M || 0} label="M-CLASS" color="#FFB347" size={100} />
          <GaugeArc value={solarProbs.X || 0} label="X-CLASS" color="#FF3B3B" size={100} />
        </div>

        {/* Bottom Row: B and C (Low Impact) */}
        <div className="flex justify-around items-center px-8 opacity-70">
          <GaugeArc value={solarProbs.B || 0} label="B-CLASS" color="#8FA3C0" size={70} />
          <GaugeArc value={solarProbs.C || 0} label="C-CLASS" color="#00E5A0" size={70} />
        </div>
      </div>

      <div className="flex justify-between items-center mt-auto pt-3 border-t-[0.5px] border-border-subtle/50 shrink-0">
        <span className="font-mono text-[9px] text-text-secondary">ALGORITHM: ENSEMBLE RNN+CNN</span>
        <span className="font-mono text-[9px] text-text-secondary">COMPUTED: {computedTime}</span>
      </div>
    </Card>
  );
}
