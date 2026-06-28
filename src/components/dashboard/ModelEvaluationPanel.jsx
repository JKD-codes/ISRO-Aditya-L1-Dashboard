import React, { useMemo } from 'react';
import { Card } from '../ui/Card';
import useMLStore from '../../store/useMLStore';
import AnimatedCounter from '../ui/AnimatedCounter';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

/* ----- Confusion Matrix Heatmap ----- */
function ConfusionMatrix({ matrix, labels }) {
  if (!matrix || matrix.length === 0) return null;

  const maxVal = Math.max(...matrix.flat(), 1);

  return (
    <div className="mt-4">
      <div className="font-mono text-[9px] text-text-secondary mb-2">CONFUSION MATRIX (PREDICTED vs ACTUAL)</div>

      {/* Column headers */}
      <div className="flex">
        <div className="w-10" />
        {labels.map(l => (
          <div key={l} className="flex-1 text-center font-mono text-[9px] text-text-secondary pb-1">{l}</div>
        ))}
      </div>

      {/* Matrix rows */}
      {matrix.map((row, i) => (
        <div key={i} className="flex items-center">
          <div className="w-10 font-mono text-[9px] text-text-secondary text-right pr-2">{labels[i]}</div>
          {row.map((val, j) => {
            const intensity = val / maxVal;
            const bgColor = i === j
              ? `rgba(0, 229, 160, ${Math.max(0.1, intensity * 0.8)})`
              : `rgba(255, 59, 59, ${Math.max(0.05, intensity * 0.6)})`;

            return (
              <div key={j}
                className="flex-1 text-center font-mono text-[10px] py-2 border border-border-subtle/30"
                style={{ backgroundColor: bgColor, color: val > 0 ? '#fff' : '#555' }}
              >
                {val}
              </div>
            );
          })}
        </div>
      ))}
      <div className="flex mt-1">
        <div className="w-10" />
        <div className="flex-1 text-center font-mono text-[8px] text-text-secondary">← Predicted →</div>
      </div>
    </div>
  );
}

/* ----- Main Panel ----- */
export function ModelEvaluationPanel() {
  const modelMetrics = useMLStore(state => state.modelMetrics);

  const metrics = modelMetrics || {};
  const perClass = metrics.per_class || {};

  const barData = useMemo(() => {
    return ['B', 'C', 'M', 'X'].map(cls => ({
      name: cls,
      TPR: ((perClass[cls]?.TPR || 0) * 100).toFixed(1),
      FAR: ((perClass[cls]?.FAR || 0) * 100).toFixed(1),
      F1: ((perClass[cls]?.f1 || 0) * 100).toFixed(1),
    }));
  }, [perClass]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#020B18] border border-border-subtle p-2 font-mono text-[10px]">
          <div className="text-text-secondary mb-1">{label}-CLASS</div>
          {payload.map((p, i) => (
            <div key={i} style={{ color: p.color }}>
              {p.name}: {p.value}%
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card title="MODEL EVALUATION METRICS" className="flex flex-col">
      {/* Top-line metrics */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'ACCURACY', value: (metrics.accuracy || 0) * 100, color: '#00E5A0' },
          { label: 'TSS', value: (metrics.TSS || 0) * 100, color: '#4FC3F7' },
          { label: 'HSS', value: (metrics.HSS || 0) * 100, color: '#B388FF' },
          { label: 'TPR (AVG)', value: (metrics.TPR || 0) * 100, color: '#FFB347' },
          { label: 'FAR (AVG)', value: (metrics.FAR || 0) * 100, color: '#FF3B3B' },
        ].map(m => (
          <div key={m.label} className="text-center">
            <span className="font-mono text-[9px] text-text-secondary block">{m.label}</span>
            <span className="font-mono text-xl font-bold" style={{ color: m.color }}>
              <AnimatedCounter value={parseFloat(m.value.toFixed(1))} decimals={1} suffix="%" />
            </span>
          </div>
        ))}
      </div>

      {/* Per-class TPR vs FAR chart */}
      <div className="font-mono text-[9px] text-text-secondary mb-2">PER-CLASS: TPR / FAR / F1</div>
      <div className="h-40 w-full mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" stroke="#555" tick={{ fill: '#8FA3C0', fontSize: 10, fontFamily: 'monospace' }} />
            <YAxis stroke="#555" tick={{ fill: '#8FA3C0', fontSize: 9, fontFamily: 'monospace' }} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="TPR" fill="#00E5A0" radius={[2, 2, 0, 0]} maxBarSize={30} name="TPR" />
            <Bar dataKey="FAR" fill="#FF3B3B" radius={[2, 2, 0, 0]} maxBarSize={30} name="FAR" />
            <Bar dataKey="F1" fill="#B388FF" radius={[2, 2, 0, 0]} maxBarSize={30} name="F1" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Confusion Matrix */}
      <ConfusionMatrix
        matrix={metrics.confusion_matrix || []}
        labels={metrics.class_labels || ['Q', 'B', 'C', 'M', 'X']}
      />

      {/* Model info */}
      <div className="mt-4 p-3 bg-[#0A1929] rounded border border-border-subtle/50">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] text-text-secondary">MODEL VERSION</span>
          <span className="font-mono text-[10px] text-text-primary">{metrics.model_version || 'N/A'}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="font-mono text-[10px] text-text-secondary">TRAINING SAMPLES</span>
          <span className="font-mono text-[10px] text-text-primary">{metrics.total_samples || 0}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="font-mono text-[10px] text-text-secondary">EVALUATION SET</span>
          <span className="font-mono text-[10px] text-text-primary">{metrics.evaluation_set || 'training'}</span>
        </div>
      </div>

      {/* Data disclaimer */}
      <div className="mt-3 p-3 bg-[#1A1A0A] rounded border border-[#FFB347]/30">
        <div className="flex gap-2 items-start">
          <span className="text-[#FFB347] text-[10px] font-bold shrink-0">⚠</span>
          <span className="font-mono text-[9px] text-[#FFB347]/80 leading-relaxed">
            {metrics.data_disclaimer ||
              'Metrics computed on synthetic held-out data. Real-world performance on GOES/Aditya-L1 data will differ. Designed for PRADAN FITS data swap-in.'}
          </span>
        </div>
      </div>
    </Card>
  );
}
