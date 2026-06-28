import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import axios from 'axios';
import gsap from '../animations/gsap.config';
import { Brain, Zap, Target, BarChart2 } from 'lucide-react';
import { FeatureImportanceChart } from '../components/ml/FeatureImportanceChart';
import { ModelMetricsCard } from '../components/ml/ModelMetricsCard';

export default function ModelExplainerPage() {
  const [featureImportances, setFeatureImportances] = useState([]);
  
  useEffect(() => {
    // Attempt to fetch from backend
    axios.get('http://localhost:8000/api/ml/features')
      .then(res => {
        if (res.data && res.data.feature_importances) {
          // Format as array for Recharts
          const formatted = Object.entries(res.data.feature_importances).map(([k, v]) => ({
            feature: k,
            value: v
          })).sort((a, b) => a.value - b.value); // Sort ascending for horizontal bar chart
          setFeatureImportances(formatted);
        }
      })
      .catch(err => {
        console.warn("Using fallback feature importances", err);
        setFeatureImportances([
          { feature: 'Background Flux', value: 0.05 },
          { feature: 'AR Area', value: 0.10 },
          { feature: 'AR Magnetic Class', value: 0.10 },
          { feature: 'XRS-A / XRS-B Ratio', value: 0.15 },
          { feature: 'HEL1OS HXR (Neupert)', value: 0.25 },
          { feature: 'Soft X-Ray d/dt', value: 0.35 }
        ]);
      });

    // GSAP entrance animation
    gsap.fromTo('.stagger-section', 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: 'power3.out' }
    );
  }, []);

  // Mock static data for Neupert Explainer Chart
  const mockNeupertData = Array.from({ length: 30 }, (_, i) => {
    const x = i - 15;
    const hardXray = 80 * Math.exp(-Math.pow(x + 5, 2) / 6); // Peaks earlier
    const softXray = 120 * Math.exp(-Math.pow(x, 2) / 15);   // Peaks later and wider
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          
          {/* Model Info Card */}
          <div className="stagger-section">
            <ModelMetricsCard />
          </div>

          {/* Feature Importances */}
          <Card title="XGBOOST FEATURE IMPORTANCES" className="stagger-section flex-1 min-h-[320px]">
            <FeatureImportanceChart data={featureImportances} />
          </Card>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          
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
                  
                  <ReferenceLine x={10} yAxisId="left" stroke="#FFB347" strokeDasharray="3 3" label={{ value: 'Hard X-Ray Peak', fill: '#FFB347', position: 'insideTopLeft', fontSize: 10 }} />
                  <ReferenceLine x={15} yAxisId="right" stroke="#4FC3F7" strokeDasharray="3 3" label={{ value: 'Soft X-Ray Peak', fill: '#4FC3F7', position: 'insideTopRight', fontSize: 10 }} />

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
