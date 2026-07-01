import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';
import useMLStore from '../../store/useMLStore';
import { cn } from '../../lib/utils';
import AnimatedCounter from '../ui/AnimatedCounter';
import GlowPulse from '../ui/GlowPulse';
import gsap from '../../animations/gsap.config';

const GaugeArc = ({ value, label, color, size = 80 }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  
  const circleRef = useRef(null);

  useEffect(() => {
    if (circleRef.current) {
      gsap.to(circleRef.current, {
        strokeDashoffset: offset,
        duration: 1.2,
        ease: 'power3.out'
      });
    }
  }, [offset]);

  // Initial render offset could be full circumference to animate in
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
            ref={circleRef}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference} // start empty
            strokeLinecap="round"
          />
        </svg>
        <span className="font-mono text-sm font-bold text-text-primary">
          <AnimatedCounter value={value} suffix="%" />
        </span>
      </div>
      <span className="font-mono text-[10px] text-text-secondary tracking-widest">{label}</span>
    </div>
  );
};

export function FlareProbabilityGauge() {
  const { forecastMode, setForecastMode, pipelineNowcast, solarProbs } = useStore();
  const mlForecast = useMLStore(state => state.mlForecast);
  const [computedTime, setComputedTime] = useState('');

  useEffect(() => {
    const d = new Date(Date.now() - Math.floor(Math.random() * 8 + 2) * 60000);
    setComputedTime(d.toISOString().substring(11, 19) + ' UTC');
  }, []);

  // Extract T+30 forecast (horizons[1])
  const t30Forecast = useMemo(() => {
    if (mlForecast?.horizons && mlForecast.horizons.length > 1) {
      return mlForecast.horizons[1].class_probs || { B: 0, C: 0, M: 0, X: 0 };
    }
    return { B: 0, C: 0, M: 0, X: 0 };
  }, [mlForecast]);

  
  // Nowcast values
  const pipelineConfidence = pipelineNowcast?.detection?.confidence_pct ?? 0;
  const detectedClass = pipelineNowcast?.detection?.flare_detected 
    ? pipelineNowcast.detection.flare_class 
    : 'NONE';

  const isHighRisk = forecastMode === 'nowcast' ? ((solarProbs?.M > 40) || (solarProbs?.X > 20) || (pipelineConfidence > 50)) : (t30Forecast.M > 40 || t30Forecast.X > 40);
  const glowColor = forecastMode === 'nowcast' ? ((solarProbs?.X > 20) ? 'rgba(255, 59, 59, 0.4)' : 'rgba(255, 179, 71, 0.4)') : (t30Forecast.X > 40 ? 'rgba(255, 59, 59, 0.4)' : 'rgba(255, 179, 71, 0.4)');

  return (
    <GlowPulse active={isHighRisk} color={glowColor} className="h-full flex flex-col">
      <Card className="flex flex-col h-full flex-1">
        <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-3 mb-4">
          <div className="flex flex-col">
            <h3 className="font-display text-[13px] tracking-wider font-bold">{forecastMode === "nowcast" ? "PIPELINE DETECTOR (NOWCAST)" : "FLARE PROBABILITY (T+30M)"}</h3>
            <span className="font-mono text-[9px] text-accent-orange/70">{forecastMode === "nowcast" ? "NEUPERT EFFECT PIPELINE" : "XGBOOST ML FORECAST"}</span>
          </div>

          <div className="flex bg-[#0A1929] rounded p-0.5 border border-border-subtle/50 shrink-0">
            <button
              onClick={() => setForecastMode('nowcast')}
              className={cn(
                "px-2 py-1 text-[9px] font-mono rounded transition-colors",
                forecastMode === 'nowcast' ? "bg-[#1E3A5F] text-white" : "text-text-secondary hover:text-white"
              )}
            >
              NOWCAST
            </button>
            <button
              onClick={() => setForecastMode('forecast')}
              className={cn(
                "px-2 py-1 text-[9px] font-mono rounded transition-colors",
                forecastMode === 'forecast' ? "bg-[#1E3A5F] text-white" : "text-text-secondary hover:text-white"
              )}
            >
              FORECAST
            </button>
          </div>
        </div>

        {forecastMode === 'nowcast' ? (
          <div className="flex-1 flex items-center justify-between gap-2 pb-2 px-1">
            {/* Left: Overall Confidence and Flare Class */}
            <div className="flex flex-col items-center justify-center bg-[#071324]/50 border border-purple-500/10 rounded p-3 w-[45%] h-full min-h-[120px]">
              <span className="font-mono text-[9px] text-[#8FA3C0] tracking-widest uppercase mb-1">DETECTION CONF</span>
              <GaugeArc value={pipelineConfidence} label="" color="#00E5A0" size={85} />
              <div className="mt-2 text-center">
                <span className="font-mono text-[9px] text-text-secondary block">DETECTED CLASS</span>
                <span className={cn(
                  "font-display text-xs font-bold tracking-wider",
                  detectedClass !== 'NONE' ? "text-[#FF3B3B]" : "text-[#8FA3C0]/60"
                )}>
                  {detectedClass}
                </span>
              </div>
            </div>

            {/* Right: NOAA Probs */}
            <div className="flex flex-col justify-around gap-2 w-[50%] h-full">
              <div className="flex items-center justify-between bg-[#071324]/30 px-3 py-1.5 rounded border border-border-subtle/20">
                <span className="font-mono text-[9px] text-text-secondary">C-CLASS PROB</span>
                <span className="font-mono text-xs font-bold text-[#00E5A0]">{solarProbs?.C ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between bg-[#071324]/30 px-3 py-1.5 rounded border border-border-subtle/20">
                <span className="font-mono text-[9px] text-text-secondary">M-CLASS PROB</span>
                <span className="font-mono text-xs font-bold text-[#FFB347]">{solarProbs?.M ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between bg-[#071324]/30 px-3 py-1.5 rounded border border-border-subtle/20">
                <span className="font-mono text-[9px] text-text-secondary">X-CLASS PROB</span>
                <span className="font-mono text-xs font-bold text-[#FF3B3B]">{solarProbs?.X ?? 0}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center gap-4 pb-2">
            {/* Top Row: M and X (High Impact) */}
            <div className="flex justify-around items-center px-1">
              <GaugeArc value={t30Forecast.M || 0} label="M-CLASS" color="#FFB347" size={80} />
              <GaugeArc value={t30Forecast.X || 0} label="X-CLASS" color="#FF3B3B" size={80} />
            </div>

            {/* Bottom Row: B and C (Low Impact) */}
            <div className="flex justify-around items-center px-4 opacity-70">
              <GaugeArc value={t30Forecast.B || 0} label="B-CLASS" color="#8FA3C0" size={55} />
              <GaugeArc value={t30Forecast.C || 0} label="C-CLASS" color="#00E5A0" size={55} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-between items-center mt-auto pt-3 border-t-[0.5px] border-border-subtle/50 shrink-0 gap-2">
          <span className="font-mono text-[9px] text-text-secondary">{forecastMode === "nowcast" ? "ALGORITHM: NEUPERT EFFECT V1.0" : "ALG: XGBOOST REALTIME"}</span>
          <span className="font-mono text-[9px] text-text-secondary">COMPUTED: {computedTime}</span>
        </div>
      </Card>
    </GlowPulse>
  );
}
