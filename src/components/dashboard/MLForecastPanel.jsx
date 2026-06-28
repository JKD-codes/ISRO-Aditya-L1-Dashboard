import React, { useRef, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Card } from '../ui/Card';
import useMLStore from '../../store/useMLStore';
import AnimatedCounter from '../ui/AnimatedCounter';
import gsap from '../../animations/gsap.config';

const ProbBar = ({ label, value, color }) => {
  const barRef = useRef(null);
  
  useEffect(() => {
    if (barRef.current) {
      gsap.to(barRef.current, {
        width: `${value}%`,
        duration: 0.8,
        ease: 'power3.out'
      });
    }
  }, [value]);

  return (
    <div className="flex items-center gap-3 w-full my-1.5">
      <span className="w-4 font-mono text-[11px] font-bold text-text-secondary text-center">{label}</span>
      <div className="flex-1 h-3 bg-[#0A1929] rounded overflow-hidden">
        <div ref={barRef} className="h-full rounded" style={{ backgroundColor: color, width: '0%' }} />
      </div>
      <span className="w-10 text-right font-mono text-[11px] font-bold" style={{ color }}>
        <AnimatedCounter value={value || 0} suffix="%" />
      </span>
    </div>
  );
};

export function MLForecastPanel({ defaultHorizon = 15 }) {
  const mlForecast = useMLStore(state => state.mlForecast);

  const horizons = mlForecast?.horizons || [
    { horizon: 15, class_probs: { B: 0, C: 0, M: 0, X: 0 }, confidence: 82 },
    { horizon: 30, class_probs: { B: 0, C: 0, M: 0, X: 0 }, confidence: 61 },
    { horizon: 60, class_probs: { B: 0, C: 0, M: 0, X: 0 }, confidence: 41 },
  ];

  const colors = {
    B: '#8FA3C0',
    C: '#FDE047',
    M: '#FFB347',
    X: '#FF3B3B'
  };

  return (
    <Card className="flex flex-col h-full" title={`XGBOOST FORECAST (T+${defaultHorizon}M)`}>
      <Tabs.Root defaultValue={defaultHorizon.toString()} className="flex flex-col flex-1 mt-1">
        <Tabs.List className="flex gap-2 border-b border-border-subtle/50 pb-2 mb-4 shrink-0">
          {horizons.map(h => (
            <Tabs.Trigger 
              key={h.horizon}
              value={h.horizon.toString()}
              className="flex-1 px-2 py-1 font-mono text-[10px] rounded transition-all
                         data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white data-[state=active]:font-bold
                         data-[state=inactive]:text-text-secondary data-[state=inactive]:hover:bg-[#1E3A5F]/50
                         outline-none focus:ring-1 focus:ring-purple-500/50"
            >
              T+{h.horizon} MIN
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {horizons.map(h => (
          <Tabs.Content 
            key={h.horizon} 
            value={h.horizon.toString()} 
            className="flex-1 flex flex-col focus:outline-none"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="font-mono text-[10px] text-text-secondary">PROBABILITY DISTRIBUTION</span>
              <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 border border-purple-500/30 rounded text-[9px] font-mono tracking-wider">
                {h.confidence || 0}% CONFIDENCE
              </span>
            </div>

            <div className="flex flex-col justify-center flex-1 pb-2">
              <ProbBar label="B" value={h.class_probs?.B || 0} color={colors.B} />
              <ProbBar label="C" value={h.class_probs?.C || 0} color={colors.C} />
              <ProbBar label="M" value={h.class_probs?.M || 0} color={colors.M} />
              <ProbBar label="X" value={h.class_probs?.X || 0} color={colors.X} />
            </div>
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </Card>
  );
}
