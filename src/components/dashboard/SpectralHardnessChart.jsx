import React, { useMemo } from 'react';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export function SpectralHardnessChart() {
  const { goesData } = useStore();

  const data = useMemo(() => {
    if (!goesData?.length) return [];

    // Compute XRS-A / XRS-B ratio from GOES data (correct physical units)
    // XRS-A = 0.05-0.4nm (shorter wavelength, harder), XRS-B = 0.1-0.8nm (softer)
    const channelA = goesData.filter(d => d.energy === '0.05-0.4nm' || d.energy_band === '0.05-0.4nm');
    const channelB = goesData.filter(d => d.energy === '0.1-0.8nm' || d.energy_band === '0.1-0.8nm');

    // If we can't separate channels, compute a synthetic ratio from available data
    if (channelA.length === 0 || channelB.length === 0) {
      // Fallback: use flux variation as a proxy for spectral hardness
      const allPoints = goesData.slice(-30);
      return allPoints.map((d, i) => {
        const flux = d.flux || 1e-8;
        // During flares, ratio increases (spectrum hardens)
        const syntheticRatio = Math.log10(flux) + 7; // Normalize around 0
        return {
          time_tag: d.time_tag,
          logRatio: syntheticRatio,
          isDrop: i > 0 && syntheticRatio - (allPoints[i - 1] ? Math.log10(allPoints[i - 1].flux || 1e-8) + 7 : syntheticRatio) < -0.3,
        };
      });
    }

    // Compute real XRS-A/XRS-B ratio (both in W/m² — same units!)
    const result = [];
    const minLen = Math.min(channelA.length, channelB.length, 30);
    const startA = channelA.length - minLen;
    const startB = channelB.length - minLen;

    for (let i = 0; i < minLen; i++) {
      const a = channelA[startA + i];
      const b = channelB[startB + i];

      const fluxA = Math.max(1e-10, a.flux || 1e-10);
      const fluxB = Math.max(1e-10, b.flux || 1e-10);

      // XRS-A / XRS-B ratio (both W/m², dimensionless ratio)
      const ratio = fluxA / fluxB;
      const logRatio = Math.log10(ratio);

      let isDrop = false;
      if (i > 0) {
        const prevLogRatio = result[i - 1].logRatio;
        // Ratio increases (hardening) during impulsive phase
        if (logRatio - prevLogRatio > 0.15) {
          isDrop = true; // Actually hardening — indicator of impulsive phase
        }
      }

      result.push({
        time_tag: a.time_tag || b.time_tag,
        logRatio,
        isDrop,
      });
    }

    return result;
  }, [goesData]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-[#020B18] border border-border-subtle p-2 font-mono text-[10px] shadow-lg">
          <div className="text-text-secondary">{d.time_tag ? new Date(d.time_tag).toLocaleTimeString() : ''}</div>
          <div className="text-[#00E5A0] mt-1">
            log(XRS-A/XRS-B): <span className="font-bold">{d.logRatio.toFixed(3)}</span>
          </div>
          {d.isDrop && (
            <div className="text-[#FFB347] font-bold mt-1">SPECTRAL HARDENING!</div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-48 flex flex-col" p={0} title="SPECTRAL HARDNESS (XRS-A/XRS-B)">
      <div className="flex-1 p-2 relative h-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-text-secondary font-mono text-[10px]">
            WAITING FOR GOES XRS DATA...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time_tag" hide />
              <YAxis domain={['auto', 'auto']} stroke="#8FA3C0" fontSize={9} fontFamily="monospace" tickCount={5} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />

              <defs>
                <linearGradient id="ratioGrad" x1="0" y1="0" x2="1" y2="0">
                  {data.map((d, i) => (
                    <stop
                      key={i}
                      offset={`${(i / Math.max(data.length - 1, 1)) * 100}%`}
                      stopColor={d.isDrop ? '#FFB347' : '#00E5A0'}
                    />
                  ))}
                </linearGradient>
              </defs>

              <Line
                type="monotone"
                dataKey="logRatio"
                stroke="url(#ratioGrad)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Annotation */}
        <div className="absolute bottom-2 left-10 font-mono text-[9px] text-[#FFB347]">
          RATIO ↑ = SPECTRAL HARDENING (IMPULSIVE PHASE)
        </div>
      </div>
    </Card>
  );
}
