import React, { useMemo, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import useMLStore from '../../store/useMLStore';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import AnimatedCounter from '../ui/AnimatedCounter';
import gsap from '../../animations/gsap.config';

export function NeupertEffectPanel() {
  const solexsLive = useMLStore(state => state.solexsLive);
  const heliosLive = useMLStore(state => state.heliosLive);
  const neupertResult = useMLStore(state => state.neupertResult) || { confirmed: false, lead_mins: 0, correlation: 0 };
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (neupertResult.confirmed && wrapperRef.current) {
      // GSAP Highlight Animation on confirmation
      gsap.fromTo(wrapperRef.current, 
        { boxShadow: '0 0 0px rgba(74, 222, 128, 0)' },
        { 
          boxShadow: '0 0 25px rgba(74, 222, 128, 0.6)',
          duration: 0.6,
          yoyo: true,
          repeat: 3,
          ease: 'sine.inOut'
        }
      );
    }
  }, [neupertResult.confirmed]);

  const chartData = useMemo(() => {
    const combined = [];
    const minLen = Math.min(solexsLive.length, heliosLive.length);
    
    for (let i = 1; i < minLen; i++) {
      const sPrev = solexsLive[i - 1];
      const s = solexsLive[i];
      const h = heliosLive[i];
      
      const t = new Date(s.time_tag).getTime();
      const tPrev = new Date(sPrev.time_tag).getTime();
      const dt = (t - tPrev) / 1000;
      
      // Compute d(SoLEXS)/dt
      const dFluxDt = dt > 0 ? (s.flux - sPrev.flux) / dt : 0;

      combined.push({
        time: t,
        formattedTime: new Date(t).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        hardXray: h.counts_per_sec,
        dFluxDt: dFluxDt
      });
    }
    return combined;
  }, [solexsLive, heliosLive]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length >= 2) {
      const helios = payload.find(p => p.dataKey === 'hardXray')?.value;
      const dFlux = payload.find(p => p.dataKey === 'dFluxDt')?.value;
      
      return (
        <div className="bg-[#020B18] border border-border-subtle p-3 rounded-sm font-mono text-[10px] shadow-lg flex flex-col gap-1.5 z-50">
          <div className="text-text-secondary border-b-[0.5px] border-border-subtle/50 pb-1.5">{label}</div>
          <div className="flex justify-between gap-4">
            <span className="text-[#FFB347]">HEL1OS:</span>
            <span className="font-bold">{helios?.toFixed(1)} counts/s</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#4FC3F7]">d(SoLEXS)/dt:</span>
            <span className="font-bold">{dFlux?.toExponential(2)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div ref={wrapperRef} className="h-full flex flex-col" style={{ borderRadius: '4px' }}>
      <Card className="flex-1 flex flex-col" title="NEUPERT EFFECT ANALYSIS" 
        headerRight={
          neupertResult.confirmed ? (
            <span className="px-2 py-0.5 bg-green-900/30 text-green-400 border border-green-500/30 rounded text-[9px] font-mono font-bold tracking-wider">
              NEUPERT CONFIRMED ✓
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-gray-800 text-gray-400 border border-gray-600 rounded text-[9px] font-mono font-bold tracking-wider">
              MONITORING
            </span>
          )
        }
      >
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] text-text-secondary">PEAK LEAD TIME</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono text-text-primary">
                  <AnimatedCounter value={neupertResult.lead_mins || 0} decimals={1} />
                </span>
                <span className="font-mono text-xs text-text-secondary">MINUTES</span>
              </div>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-mono text-[10px] text-text-secondary">CORRELATION</span>
              <span className="font-mono text-sm text-text-primary mt-1">
                <AnimatedCounter value={(neupertResult.correlation || 0) * 100} decimals={1} suffix="%" />
              </span>
            </div>
          </div>

          <div className="h-32 w-full relative mb-4">
            {chartData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-text-secondary">
                WAITING FOR TELEMETRY...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="formattedTime" hide />
                  <YAxis yAxisId="left" hide domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" hide domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="hardXray" 
                    stroke="#FFB347" 
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="dFluxDt" 
                    stroke="#4FC3F7" 
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-auto bg-[#0A1929] p-3 rounded border border-border-subtle/50">
            <p className="font-mono text-[10px] text-text-secondary leading-relaxed">
              {neupertResult.confirmed 
                ? `HEL1OS hard X-rays peaked ${neupertResult.lead_mins} min before SoLEXS soft X-rays, confirming particle acceleration (Neupert Effect).`
                : "Monitoring for empirical relationship where hard X-ray flux is proportional to the time derivative of soft X-ray flux."}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
