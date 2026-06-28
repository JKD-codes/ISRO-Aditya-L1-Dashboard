import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';
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
            strokeDashoffset={circumference}
            strokeLinecap="round"
          />
        </svg>
        <span className="font-mono text-sm font-bold text-text-primary">
          <AnimatedCounter value={value} suffix="%" />
        </span>
      </div>
      <span className="font-mono text-[9px] text-text-secondary tracking-widest text-center whitespace-nowrap">{label}</span>
    </div>
  );
};

export function FlareProbabilityGauge() {
  const { forecastMode, setForecastMode, pipelineNowcast, pipelineForecast, solarProbs } = useStore();
  const [computedTime, setComputedTime] = useState('');

  useEffect(() => {
    if (pipelineNowcast?.timestamp_utc) {
      setComputedTime(new Date(pipelineNowcast.timestamp_utc).toISOString().substring(11, 19) + ' UTC');
    } else {
      setComputedTime(new Date().toISOString().substring(11, 19) + ' UTC');
    }
  }, [pipelineNowcast]);

  // Nowcast values
  const pipelineConfidence = pipelineNowcast?.detection?.confidence_pct ?? 0;
  const detectedClass = pipelineNowcast?.detection?.flare_detected 
    ? pipelineNowcast.detection.flare_class 
    : 'NONE';

  const isHighRisk = (solarProbs?.M > 40) || (solarProbs?.X > 20) || (pipelineConfidence > 50);
  const glowColor = (solarProbs?.X > 20) ? 'rgba(255, 59, 59, 0.4)' : 'rgba(255, 179, 71, 0.4)';

  // Forecast time horizons
  const windows = pipelineForecast?.windows || [];
  const f6h = windows[0]?.m_class_prob_pct ?? 0;
  const f12h = windows[1]?.m_class_prob_pct ?? 0;
  const f24h = windows[2]?.m_class_prob_pct ?? 0;
  const f48h = windows[3]?.m_class_prob_pct ?? 0;

  return (
    <GlowPulse active={isHighRisk} color={glowColor} className="h-full flex flex-col">
      <Card className="flex flex-col h-full flex-1">
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <h3 className="font-display text-sm tracking-wider font-bold">
              {forecastMode === 'nowcast' ? 'PIPELINE DETECTOR (NOWCAST)' : 'ML PROBABILITY (FORECAST)'}
            </h3>
            <span className="font-mono text-[9px] text-accent-orange/70">
              {forecastMode === 'nowcast' ? 'NEUPERT EFFECT PIPELINE' : 'PERSISTENCE DECAY MODEL'}
            </span>
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
          <div className="flex-1 flex flex-col justify-center gap-6 pb-2">
            {/* Top Row: +6h and +12h */}
            <div className="flex justify-around items-center px-4">
              <GaugeArc value={f6h} label="+6H HORIZON" color="#FFB347" size={90} />
              <GaugeArc value={f12h} label="+12H HORIZON" color="#FF6B00" size={90} />
            </div>

            {/* Bottom Row: +24h and +48h */}
            <div className="flex justify-around items-center px-4 opacity-80">
              <GaugeArc value={f24h} label="+24H HORIZON" color="#FF3B3B" size={75} />
              <GaugeArc value={f48h} label="+48H HORIZON" color="#CC0000" size={75} />
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-auto pt-3 border-t-[0.5px] border-border-subtle/50 shrink-0">
          <span className="font-mono text-[9px] text-text-secondary">
            {forecastMode === 'nowcast' ? 'ALGORITHM: NEUPERT EFFECT V1.0' : 'MODEL: PERSISTENCE DECAY'}
          </span>
          <span className="font-mono text-[9px] text-text-secondary">COMPUTED: {computedTime}</span>
        </div>
      </Card>
    </GlowPulse>
  );
}
