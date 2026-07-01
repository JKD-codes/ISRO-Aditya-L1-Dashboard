import React, { useMemo } from 'react';
import { Card } from '../ui/Card';
import useMLStore from '../../store/useMLStore';
import { Cpu } from 'lucide-react';

const FEATURE_META = {
  solexs_flux_current:     { label: 'SoLEXS Flux',       unit: 'W/m²',  alert: (v) => v > 1e-6, format: (v) => v.toExponential(2) },
  solexs_flux_mean_5min:   { label: 'SoLEXS Mean (5m)',  unit: 'W/m²',  alert: (v) => v > 1e-6, format: (v) => v.toExponential(2) },
  solexs_flux_mean_15min:  { label: 'SoLEXS Mean (15m)', unit: 'W/m²',  alert: (v) => v > 1e-6, format: (v) => v.toExponential(2) },
  solexs_dflux_dt:         { label: 'd(Flux)/dt',        unit: '/s',     alert: (v) => v > 1e-9, format: (v) => v.toExponential(2) },
  solexs_d2flux_dt2:       { label: 'd²(Flux)/dt²',      unit: '/s²',   alert: (v) => v > 1e-12, format: (v) => v.toExponential(2) },
  solexs_rise_rate_5min:   { label: 'Rise Rate (5m)',     unit: '/s',    alert: (v) => v > 1e-9, format: (v) => v.toExponential(2) },
  helios_counts_current:   { label: 'HEL1OS Counts',     unit: 'c/s',   alert: (v) => v > 200,  format: (v) => v.toFixed(0) },
  helios_counts_mean_5min: { label: 'HEL1OS Mean (5m)',   unit: 'c/s',   alert: (v) => v > 150,  format: (v) => v.toFixed(1) },
  helios_counts_std_5min:  { label: 'HEL1OS σ (5m)',     unit: 'c/s',   alert: (v) => v > 50,   format: (v) => v.toFixed(1) },
  helios_spike_ratio:      { label: 'Spike Ratio',       unit: '×bg',   alert: (v) => v > 3,    format: (v) => v.toFixed(2) },
  spectral_hardness_ratio: { label: 'Hardness Ratio',    unit: '',      alert: (v) => v > 5,    format: (v) => v.toFixed(2) },
  neupert_cross_corr:      { label: 'Neupert r',         unit: '',      alert: (v) => v > 0.5,  format: (v) => v.toFixed(3) },
};

export function FeatureVectorPanel() {
  const featureVector = useMLStore(state => state.featureVector);

  const features = useMemo(() => {
    if (!featureVector) return [];

    return Object.entries(FEATURE_META).map(([key, meta]) => {
      const value = featureVector[key] || 0;
      const isAlert = meta.alert(value);
      return {
        key,
        label: meta.label,
        value,
        formatted: meta.format(value),
        unit: meta.unit,
        isAlert,
      };
    });
  }, [featureVector]);

  if (!featureVector) {
    return (
      <Card title="LIVE FEATURE VECTOR" className="flex flex-col">
        <div className="flex items-center justify-center h-32">
          <span className="font-mono text-[10px] text-text-secondary animate-pulse">
            WAITING FOR ML PIPELINE...
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card title="LIVE FEATURE VECTOR (12-DIM)" className="flex flex-col"
      headerRight={
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-mono text-[9px] text-purple-300">XGBOOST INPUT</span>
        </div>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
        {features.map(f => (
          <div key={f.key}
            className={`flex justify-between items-center px-2 py-1.5 rounded border transition-all ${
              f.isAlert
                ? 'border-[#FFB347]/30 bg-[#FFB347]/5'
                : 'border-border-subtle/30 bg-transparent'
            }`}
          >
            <div className="flex flex-col">
              <span className="font-mono text-[8px] text-text-secondary truncate max-w-[100px]">
                {f.label}
              </span>
              <span className={`font-mono text-[11px] font-bold ${f.isAlert ? 'text-[#FFB347]' : 'text-text-primary'}`}>
                {f.formatted}
              </span>
            </div>
            <span className="font-mono text-[8px] text-text-secondary ml-1">{f.unit}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 p-2 bg-purple-900/10 border border-purple-500/20 rounded">
        <p className="font-mono text-[9px] text-purple-300">
          These 12 physics-derived features are extracted from SoLEXS + HEL1OS telemetry and fed to
          the XGBoost classifier every 30 seconds. Orange-highlighted features indicate elevated activity.
        </p>
      </div>
    </Card>
  );
}
