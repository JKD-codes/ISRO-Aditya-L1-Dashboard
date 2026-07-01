import React, { useEffect, useRef, useMemo } from 'react';
import { Card } from '../ui/Card';
import * as Tooltip from '@radix-ui/react-tooltip';
import gsap from '../../animations/gsap.config';
import useMLStore from '../../store/useMLStore';
import { AlertCircle } from 'lucide-react';

const METRIC_DEFS = {
  tss: { name: 'TSS', label: 'True Skill Score', desc: 'Measures how well the forecast separates events from non-events. > 0.5 indicates skill above random. Primary metric.' },
  pod: { name: 'POD', label: 'Probability of Detection', desc: 'The fraction of observed flares that were correctly forecasted (Hit Rate).' },
  far: { name: 'FAR', label: 'False Alarm Ratio', desc: 'The fraction of forecasted flares that did not actually occur. Lower is better.' },
  hss: { name: 'HSS', label: 'Heidke Skill Score', desc: 'Measures fractional improvement of the forecast over the standard random forecast.' },
};

export function ModelMetricsCard() {
  const containerRef = useRef(null);
  const modelMetrics = useMLStore(state => state.modelMetrics);

  // Build metrics array from real backend data (NO hardcoded fallbacks)
  const metrics = useMemo(() => {
    if (!modelMetrics) return null;

    return [
      { id: 'tss', ...METRIC_DEFS.tss, value: modelMetrics.TSS || 0 },
      { id: 'pod', ...METRIC_DEFS.pod, value: modelMetrics.TPR || 0 },
      { id: 'far', ...METRIC_DEFS.far, value: modelMetrics.FAR || 0 },
      { id: 'hss', ...METRIC_DEFS.hss, value: modelMetrics.HSS || 0 },
    ];
  }, [modelMetrics]);

  useEffect(() => {
    if (containerRef.current && metrics && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const bars = containerRef.current.querySelectorAll('.metric-fill');
      gsap.fromTo(bars,
        { scaleX: 0, transformOrigin: 'left center' },
        { scaleX: 1, duration: 0.8, stagger: 0.15, ease: 'power3.out', delay: 0.2 }
      );
    }
  }, [metrics]);

  const getMetricColor = (id, value) => {
    if (id === 'far') {
      return value < 0.3 ? '#00E5A0' : value < 0.5 ? '#FFB347' : '#FF3B3B';
    }
    return value > 0.7 ? '#00E5A0' : value > 0.5 ? '#4FC3F7' : '#FFB347';
  };

  if (!metrics) {
    return (
      <Card className="flex flex-col" p={4} title="MODEL METRICS">
        <div className="flex flex-col items-center justify-center h-32">
          <AlertCircle className="w-5 h-5 text-text-secondary mb-2 opacity-30" />
          <span className="font-mono text-[10px] text-text-secondary">
            Awaiting metrics from backend...
          </span>
          <span className="font-mono text-[9px] text-text-secondary mt-1">
            Ensure backend is running at localhost:8000
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col" p={4} title="MODEL METRICS (TRAINING SET)">
      <div className="flex flex-col gap-4 mt-2" ref={containerRef}>
        <Tooltip.Provider delayDuration={200}>
          {metrics.map(metric => (
            <div key={metric.id} className="flex items-center gap-4">
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <div className="w-10 cursor-help font-mono text-[11px] font-bold text-[#8FA3C0] border-b border-dashed border-[#8FA3C0]/50 text-left shrink-0 hover:text-white transition-colors">
                    {metric.name}
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="z-[100] max-w-[200px] bg-[#020B18] border border-border-subtle p-2 rounded-sm shadow-xl animate-in fade-in zoom-in-95" sideOffset={5}>
                    <div className="font-mono text-[10px] text-white font-bold mb-1">{metric.label}</div>
                    <div className="text-[11px] text-text-secondary leading-tight">{metric.desc}</div>
                    <Tooltip.Arrow className="fill-[#1E3A5F]" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>

              <div className="w-12 font-mono text-[11px] text-white text-right shrink-0">
                {metric.value.toFixed(2)}
              </div>

              <div className="flex-1 h-3 bg-white/5 rounded-sm overflow-hidden relative border border-white/10">
                <div
                  className="metric-fill h-full absolute top-0 left-0"
                  style={{
                    width: `${Math.min(metric.value * 100, 100)}%`,
                    backgroundColor: getMetricColor(metric.id, metric.value)
                  }}
                />
              </div>
            </div>
          ))}
        </Tooltip.Provider>
      </div>

      <div className="mt-4 p-2 bg-[#0A1929] border border-border-subtle rounded-sm flex gap-2 items-start">
        <span className="text-text-secondary text-[10px] mt-[1px]">ℹ</span>
        <span className="font-mono text-[9px] text-text-secondary uppercase tracking-wider leading-relaxed">
          Computed from {modelMetrics?.total_samples || '?'} training samples.<br/>
          Model: {modelMetrics?.model_version || 'N/A'}. TSS &gt; 0.5 indicates skill above random.
        </span>
      </div>

      <div className="mt-3 p-3 bg-[#1A1A0A] rounded border border-[#FFB347]/30">
        <div className="flex gap-2 items-start">
          <span className="text-[#FFB347] text-[10px] font-bold shrink-0">⚠</span>
          <span className="font-mono text-[9px] text-[#FFB347]/80 leading-relaxed">
            {modelMetrics?.data_disclaimer ||
              'Metrics computed on synthetic held-out data. Real-world performance on GOES/Aditya-L1 data will differ. Designed for PRADAN FITS data swap-in.'}
          </span>
        </div>
      </div>
    </Card>
  );
}
