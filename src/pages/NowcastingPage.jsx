import React, { useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import useMLStore from '../store/useMLStore';
import gsap from '../animations/gsap.config';
import { Activity, Radio, CheckCircle2, XCircle, Zap, Shield } from 'lucide-react';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

/* ----- Detection Channel Card ----- */
function ChannelDetectionCard({ channel, color, icon, detection, data, dataKey, unit, thresholdLabel }) {
  const detected = detection !== null && detection !== undefined;
  const Icon = icon;

  // Prepare chart data (last 60 points)
  const chartData = (data || []).slice(-60).map((d, i) => ({
    idx: i,
    value: d[dataKey] || 0,
    time: d.time_tag ? new Date(d.time_tag).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '',
  }));

  return (
    <Card className="flex flex-col h-full" title={`${channel} CHANNEL DETECTION`}
      headerRight={
        detected ? (
          <span className="px-2 py-0.5 bg-red-900/30 text-red-400 border border-red-500/30 rounded text-[9px] font-mono font-bold tracking-wider animate-pulse">
            ⚡ ONSET DETECTED
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-green-900/20 text-green-400 border border-green-500/20 rounded text-[9px] font-mono font-bold tracking-wider">
            MONITORING
          </span>
        )
      }
    >
      {/* Live Chart */}
      <div className="h-32 w-full mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#020B18', border: '1px solid #1E3A5F', fontSize: 10, fontFamily: 'monospace' }}
              labelStyle={{ color: '#8FA3C0' }}
              formatter={(val) => [`${typeof val === 'number' ? val.toExponential(2) : val} ${unit}`, channel]}
            />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detection Metrics */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <span className="font-mono text-[9px] text-text-secondary block">STATUS</span>
          <span className={`font-mono text-sm font-bold ${detected ? 'text-red-400' : 'text-green-400'}`}>
            {detected ? 'DETECTED' : 'QUIET'}
          </span>
        </div>
        <div>
          <span className="font-mono text-[9px] text-text-secondary block">{thresholdLabel}</span>
          <span className="font-mono text-sm text-text-primary">
            {detected ? `${(detection?.sigma_above || 0).toFixed(1)}σ` : '—'}
          </span>
        </div>
        <div>
          <span className="font-mono text-[9px] text-text-secondary block">CONFIDENCE</span>
          <span className="font-mono text-sm text-text-primary">
            {detected ? `${((detection?.confidence || 0) * 100).toFixed(0)}%` : '—'}
          </span>
        </div>
      </div>

      {/* Detection Details */}
      {detected && (
        <div className="mt-4 p-3 bg-red-900/10 border border-red-500/20 rounded">
          <p className="font-mono text-[10px] text-red-300 leading-relaxed">
            {channel === 'SoLEXS'
              ? `Soft X-ray flux derivative exceeded 2σ threshold at ${detection?.time || 'N/A'}. Class: ${detection?.class || '?'}. Flux: ${detection?.flux?.toExponential(2) || '?'} W/m².`
              : `Hard X-ray counts exceeded background mean + 3σ at ${detection?.time || 'N/A'}. Counts: ${detection?.counts || '?'} c/s.`
            }
          </p>
        </div>
      )}
    </Card>
  );
}

/* ----- Cross-Validation Status ----- */
function CrossValidationPanel({ crossVal }) {
  const cv = crossVal || {};
  const solexs = cv.solexs_detected;
  const helios = cv.helios_detected;
  const validated = cv.cross_validated;

  return (
    <Card title="CROSS-VALIDATION STATUS" className="flex flex-col"
      headerRight={
        validated ? (
          <span className="px-2 py-0.5 bg-green-900/30 text-green-400 border border-green-500/30 rounded text-[9px] font-mono font-bold">
            ✓ DUAL-CHANNEL CONFIRMED
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-gray-800 text-gray-400 border border-gray-600 rounded text-[9px] font-mono font-bold">
            AWAITING
          </span>
        )
      }
    >
      <div className="flex items-center justify-center gap-8 py-6">
        {/* SoLEXS indicator */}
        <div className="flex flex-col items-center gap-2">
          <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all ${
            solexs ? 'border-[#4FC3F7] bg-[#4FC3F7]/10 shadow-[0_0_15px_rgba(79,195,247,0.3)]' : 'border-gray-600 bg-gray-800/50'
          }`}>
            {solexs ? <CheckCircle2 className="w-8 h-8 text-[#4FC3F7]" /> : <XCircle className="w-8 h-8 text-gray-500" />}
          </div>
          <span className="font-mono text-[10px] text-text-secondary">SoLEXS</span>
          <span className={`font-mono text-[9px] font-bold ${solexs ? 'text-[#4FC3F7]' : 'text-gray-500'}`}>
            {solexs ? 'DETECTED' : 'NO SIGNAL'}
          </span>
        </div>

        {/* Cross-validation arrow */}
        <div className="flex flex-col items-center gap-1">
          <div className={`w-20 h-0.5 ${validated ? 'bg-green-400' : 'bg-gray-600'}`} />
          <span className={`font-mono text-[9px] font-bold ${validated ? 'text-green-400' : 'text-gray-500'}`}>
            {validated ? '±5 MIN MATCH' : 'WAITING'}
          </span>
          <div className={`w-20 h-0.5 ${validated ? 'bg-green-400' : 'bg-gray-600'}`} />
        </div>

        {/* HEL1OS indicator */}
        <div className="flex flex-col items-center gap-2">
          <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all ${
            helios ? 'border-[#FFB347] bg-[#FFB347]/10 shadow-[0_0_15px_rgba(255,179,71,0.3)]' : 'border-gray-600 bg-gray-800/50'
          }`}>
            {helios ? <CheckCircle2 className="w-8 h-8 text-[#FFB347]" /> : <XCircle className="w-8 h-8 text-gray-500" />}
          </div>
          <span className="font-mono text-[10px] text-text-secondary">HEL1OS</span>
          <span className={`font-mono text-[9px] font-bold ${helios ? 'text-[#FFB347]' : 'text-gray-500'}`}>
            {helios ? 'DETECTED' : 'NO SIGNAL'}
          </span>
        </div>
      </div>

      {/* Combined confidence */}
      <div className="flex justify-between items-center p-3 bg-[#0A1929] rounded border border-border-subtle/50 mt-2">
        <span className="font-mono text-[10px] text-text-secondary">COMBINED CONFIDENCE</span>
        <span className={`font-mono text-lg font-bold ${validated ? 'text-green-400' : 'text-text-primary'}`}>
          <AnimatedCounter value={Math.round((cv.combined_confidence || 0) * 100)} suffix="%" />
        </span>
      </div>

      <div className="mt-3 p-3 bg-purple-900/10 border border-purple-500/20 rounded">
        <p className="font-mono text-[10px] text-purple-300 leading-relaxed">
          PS-15 Algorithm: Flare events are detected independently in SoLEXS (d/dt flux &gt; 2σ) and HEL1OS (counts &gt; μ+3σ).
          Cross-validation confirms the event if both channels detect within a ±5 minute temporal window.
        </p>
      </div>
    </Card>
  );
}


/* ----- Main Page ----- */
export default function NowcastingPage() {
  const solexsLive = useMLStore(state => state.solexsLive);
  const heliosLive = useMLStore(state => state.heliosLive);
  const nowcastResult = useMLStore(state => state.nowcastResult);
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      const cards = containerRef.current.querySelectorAll('.stagger-card');
      gsap.fromTo(cards,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out' }
      );
    }
  }, []);

  const solexsDet = nowcastResult?.solexs || nowcastResult?.cross_validation?.solexs_detection || null;
  const heliosDet = nowcastResult?.helios || nowcastResult?.cross_validation?.helios_detection || null;
  const crossVal = nowcastResult?.cross_validation || {};

  return (
    <div ref={containerRef} className="p-4 flex flex-col gap-4 min-h-screen bg-[#020B18]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border-subtle pb-3 shrink-0">
        <Shield className="w-5 h-5 text-[#4FC3F7]" />
        <h1 className="font-display text-lg font-bold tracking-widest text-text-primary">
          DUAL-CHANNEL NOWCASTING
        </h1>
        <span className="px-2 py-0.5 bg-[#1E3A5F] text-white font-mono text-[9px] rounded">
          SoLEXS + HEL1OS INDEPENDENT DETECTION
        </span>
      </div>

      {/* Dual Channel Detection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="stagger-card">
          <ChannelDetectionCard
            channel="SoLEXS"
            color="#4FC3F7"
            icon={Radio}
            detection={solexsDet}
            data={solexsLive}
            dataKey="flux"
            unit="W/m²"
            thresholdLabel="DERIV σ"
          />
        </div>
        <div className="stagger-card">
          <ChannelDetectionCard
            channel="HEL1OS"
            color="#FFB347"
            icon={Zap}
            detection={heliosDet}
            data={heliosLive}
            dataKey="counts_per_sec"
            unit="c/s"
            thresholdLabel="COUNT σ"
          />
        </div>
      </div>

      {/* Cross-Validation */}
      <div className="stagger-card">
        <CrossValidationPanel crossVal={crossVal} />
      </div>

      {/* Detection Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stagger-card">
          <Card className="text-center py-4">
            <span className="font-mono text-[9px] text-text-secondary block">SoLEXS DETECTIONS</span>
            <span className="font-mono text-2xl font-bold text-[#4FC3F7]">
              <AnimatedCounter value={nowcastResult?.status?.solexs_detections_total || 0} />
            </span>
          </Card>
        </div>
        <div className="stagger-card">
          <Card className="text-center py-4">
            <span className="font-mono text-[9px] text-text-secondary block">HEL1OS DETECTIONS</span>
            <span className="font-mono text-2xl font-bold text-[#FFB347]">
              <AnimatedCounter value={nowcastResult?.status?.helios_detections_total || 0} />
            </span>
          </Card>
        </div>
        <div className="stagger-card">
          <Card className="text-center py-4">
            <span className="font-mono text-[9px] text-text-secondary block">CROSS-VALIDATED</span>
            <span className="font-mono text-2xl font-bold text-green-400">
              <AnimatedCounter value={crossVal.cross_validated ? 1 : 0} />
            </span>
          </Card>
        </div>
        <div className="stagger-card">
          <Card className="text-center py-4">
            <span className="font-mono text-[9px] text-text-secondary block">PIPELINE STATUS</span>
            <span className="font-mono text-sm font-bold text-green-400">ACTIVE</span>
          </Card>
        </div>
      </div>
    </div>
  );
}
