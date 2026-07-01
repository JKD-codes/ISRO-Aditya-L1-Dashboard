import React, { useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import gsap from '../animations/gsap.config';
import { Brain, Zap, Target, BarChart2, AlertCircle } from 'lucide-react';
import { FeatureImportanceChart } from '../components/ml/FeatureImportanceChart';
import { ModelEvaluationPanel } from '../components/dashboard/ModelEvaluationPanel';
import { FeatureVectorPanel } from '../components/dashboard/FeatureVectorPanel';
import useMLStore from '../store/useMLStore';

export default function ModelExplainerPage() {
  const featureImportances = useMLStore(state => state.featureImportances);
  const modelMetrics = useMLStore(state => state.modelMetrics);

  useEffect(() => {
    // GSAP entrance animation
    gsap.fromTo('.stagger-section',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: 'power3.out' }
    );
  }, []);

  // Format feature importances for the chart (from real backend data)
  const formattedImportances = featureImportances?.feature_importances
    ? Object.entries(featureImportances.feature_importances)
        .map(([k, v]) => ({ feature: k, value: v }))
        .sort((a, b) => a.value - b.value)
    : [];

  // Neupert Explainer Chart (static educational)
  const mockNeupertData = Array.from({ length: 30 }, (_, i) => {
    const x = i - 15;
    const hardXray = 80 * Math.exp(-Math.pow(x + 5, 2) / 6);
    const softXray = 120 * Math.exp(-Math.pow(x, 2) / 15);
    return { time: i, hardXray, softXray };
  });

  return (
    <div className="p-4 flex flex-col gap-6 min-h-screen bg-[#020B18] overflow-y-auto">

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border-subtle pb-3 shrink-0 stagger-section">
        <Brain className="w-6 h-6 text-purple-400" />
        <h1 className="font-display text-xl font-bold tracking-widest text-text-primary">
          MODEL ARCHITECTURE & EXPLAINER
        </h1>
        <span className="px-2 py-0.5 bg-purple-900/40 text-purple-300 font-mono text-[10px] rounded border border-purple-500/30">
          FOR EVALUATORS
        </span>
      </div>

      {/* Model Evaluation Panel — Full Width */}
      <div className="stagger-section">
        <ModelEvaluationPanel />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Left Column */}
        <div className="flex flex-col gap-6">

          {/* Model Architecture Info */}
          <Card title="MODEL ARCHITECTURE" className="stagger-section">
            <div className="prose prose-sm prose-invert p-2 max-w-none">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-[#0A1929] p-3 rounded border border-border-subtle/50">
                  <span className="font-mono text-[9px] text-text-secondary block">ALGORITHM</span>
                  <span className="font-mono text-sm text-text-primary font-bold">
                    {modelMetrics?.model_version || 'XGBoost Classifier'}
                  </span>
                </div>
                <div className="bg-[#0A1929] p-3 rounded border border-border-subtle/50">
                  <span className="font-mono text-[9px] text-text-secondary block">TRAINING SAMPLES</span>
                  <span className="font-mono text-sm text-text-primary font-bold">
                    {modelMetrics?.total_samples || '—'}
                  </span>
                </div>
                <div className="bg-[#0A1929] p-3 rounded border border-border-subtle/50">
                  <span className="font-mono text-[9px] text-text-secondary block">FEATURES</span>
                  <span className="font-mono text-sm text-text-primary font-bold">12 physics-derived</span>
                </div>
                <div className="bg-[#0A1929] p-3 rounded border border-border-subtle/50">
                  <span className="font-mono text-[9px] text-text-secondary block">OUTPUT CLASSES</span>
                  <span className="font-mono text-sm text-text-primary font-bold">Q, B, C, M, X</span>
                </div>
              </div>
              <p className="text-[13px] text-text-secondary leading-relaxed">
                The pipeline extracts 12 physics-derived features from combined SoLEXS (soft X-ray flux,
                derivatives, rise rates) and HEL1OS (hard X-ray counts, spike ratios) telemetry. An XGBoost
                multi-class classifier produces probability distributions over {'{B, C, M, X}'} for three
                forecast horizons (T+15, T+30, T+60 minutes).
              </p>
            </div>
          </Card>

          {/* Feature Importances */}
          <Card title="XGBOOST FEATURE IMPORTANCES" className="stagger-section flex-1 min-h-[320px]">
            {formattedImportances.length > 0 ? (
              <FeatureImportanceChart data={formattedImportances} />
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <AlertCircle className="w-6 h-6 text-text-secondary mb-2 opacity-30" />
                <span className="font-mono text-[10px] text-text-secondary">
                  Feature importances loading from backend...
                </span>
                <span className="font-mono text-[9px] text-text-secondary mt-1">
                  Ensure backend is running at localhost:8000
                </span>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">

          {/* Live Feature Vector */}
          <div className="stagger-section">
            <FeatureVectorPanel />
          </div>

          {/* Why Dual Payload? */}
          <Card title="WHY DUAL PAYLOAD? (GOES + ADITYA-L1)" className="stagger-section">
            <div className="prose prose-sm prose-invert p-2 max-w-none">
              <p className="text-[13px] text-text-secondary leading-relaxed">
                Traditional solar dashboards rely almost entirely on <strong>GOES XRS</strong> soft X-ray data. While excellent for measuring the peak severity of a flare, soft X-rays are a gradual thermal emission. By the time a GOES soft X-ray flux curve crosses an X-class threshold, the flare is already well underway, making true short-term prediction difficult.
              </p>
              <p className="text-[13px] text-text-secondary leading-relaxed mt-3">
                <strong>Aditya-L1's HEL1OS</strong> changes the game by monitoring Hard X-rays. Hard X-rays trace the initial non-thermal particle acceleration during the impulsive phase of a flare. By ingesting real-time HEL1OS counts alongside SoLEXS and GOES flux, our XGBoost model can "see" the energy injection <em>before</em> the thermal plasma heats up.
              </p>
            </div>
          </Card>

          {/* Neupert Explainer */}
          <Card title="EMPIRICAL BASIS: THE NEUPERT EFFECT" className="stagger-section flex-1">
            <div className="h-[180px] w-full mt-2 relative">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockNeupertData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" hide />
                  <YAxis yAxisId="left" hide />
                  <YAxis yAxisId="right" orientation="right" hide />

                  <ReferenceLine x={10} yAxisId="left" stroke="#FFB347" strokeDasharray="3 3" label={{ value: 'Hard X-Ray Peak', fill: '#FFB347', position: 'top', dy: -12, fontSize: 10 }} />
                  <ReferenceLine x={15} yAxisId="right" stroke="#4FC3F7" strokeDasharray="3 3" label={{ value: 'Soft X-Ray Peak', fill: '#4FC3F7', position: 'top', dy: 12, fontSize: 10 }} />

                  <Line yAxisId="left" type="monotone" dataKey="hardXray" stroke="#FFB347" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line yAxisId="right" type="monotone" dataKey="softXray" stroke="#4FC3F7" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="absolute top-[40%] left-[38%] text-[#00E5A0] font-mono text-[10px] font-bold rotate-12">
                &larr; LEAD TIME &rarr;
              </div>
            </div>

            <div className="mt-4 p-3 bg-purple-900/10 border border-purple-500/20 rounded">
              <p className="font-mono text-[11px] text-purple-300 leading-relaxed">
                The Neupert Effect describes the empirical relationship where the Hard X-ray emission profile (orange) closely matches the time derivative of the Soft X-ray emission profile (blue). Detecting the Hard X-ray peak provides a deterministic, physics-based early warning signal for the ensuing Soft X-ray maximum.
              </p>
            </div>
          </Card>

        </div>
      </div>

    </div>
  );
}
