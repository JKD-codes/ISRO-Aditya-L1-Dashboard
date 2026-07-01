import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';
import { useGSAPEntrance } from '../../hooks/useGSAPEntrance';

export function DualPayloadChart({ title, dataSource, data }) {
  const { solexsData, heliosData, pipelineNowcast } = useStore();
  const neupertResult = pipelineNowcast?.detection;
  
  const containerRef = useGSAPEntrance({ y: 30, duration: 0.8 });

  const chartData = useMemo(() => {
    if (data && data.solexs && data.helios) {
      const combined = [];
      const len = Math.min(data.solexs.length, data.helios.length);
      for (let i = 0; i < len; i++) {
        const timeStr = data.solexs[i].time_tag;
        const t = new Date(timeStr).getTime();
        combined.push({
          time: t,
          formattedTime: new Date(timeStr).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          softXray: data.solexs[i].flux,
          hardXray: data.helios[i].counts_per_sec || data.helios[i].flux || 0
        });
      }
      return combined;
    }

    if (!solexsData?.timestamps || !heliosData?.timestamps) return [];
    
    const combined = [];
    const len = Math.min(solexsData.timestamps.length, solexsData.flux.length, heliosData.flux.length);
    for (let i = 0; i < len; i++) {
      const timeStr = solexsData.timestamps[i];
      const t = new Date(timeStr).getTime();
      combined.push({
        time: t,
        formattedTime: new Date(timeStr).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        softXray: solexsData.flux[i],
        hardXray: heliosData.flux[i]
      });
    }
    return combined;
  }, [data, solexsData, heliosData]);

  // Determine the reference line X-coordinate for Neupert Effect
  let neupertPoint = null;
  if (neupertResult?.neupert_confirmed && chartData.length > 0) {
    const latestTime = chartData[chartData.length - 1].time;
    const targetTime = latestTime - (neupertResult.neupert_delay_minutes * 60000);
    
    // Find closest data point to the lead time
    let closest = chartData[0];
    let minDiff = Math.abs(closest.time - targetTime);
    for (let p of chartData) {
      const diff = Math.abs(p.time - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }
    neupertPoint = closest.formattedTime;
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length >= 2) {
      const helios = payload.find(p => p.dataKey === 'hardXray')?.value;
      const solexs = payload.find(p => p.dataKey === 'softXray')?.value;
      
      return (
        <div className="bg-[#020B18] border border-border-subtle p-3 rounded-sm font-mono text-[10px] shadow-lg flex flex-col gap-1.5">
          <div className="text-text-secondary border-b-[0.5px] border-border-subtle/50 pb-1.5">{label}</div>
          <div className="flex justify-between gap-4">
            <span className="text-[#FFB347]">HEL1OS (Hard X-ray):</span>
            <span className="font-bold">{helios?.toFixed(1)} counts/s</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#4FC3F7]">SoLEXS (Soft X-ray):</span>
            <span className="font-bold">{solexs?.toExponential(2)} W/m²</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const isReal = solexsData?.is_real_data ?? false;

  return (
    <div ref={containerRef} className="flex-1 flex flex-col h-full">
      <Card className="flex-1 flex flex-col h-full" p={0}>
        <div className="px-4 py-2.5 border-b-[0.5px] border-border-subtle bg-[#020B18] flex items-center justify-between shrink-0">
          <div className="font-mono text-[10px] text-text-primary uppercase tracking-widest flex items-center gap-2">
            <span>{title || "ADITYA-L1 DUAL PAYLOAD · REALTIME STREAM"}</span>
          </div>
          <div className="font-mono text-[9px] text-text-secondary flex gap-3 items-center">
            {neupertResult?.neupert_confirmed && (
              <span className="text-[#FFB347]">NEUPERT EFFECT DETECTED</span>
            )}
            {/* Badge logic: dataSource prop (from Gannon pages) takes priority,
                then fall back to store's is_real_data for live streaming view */}
            {dataSource === 'real_pradan' ? (
              <span className="px-2 py-0.5 rounded border border-[#00E5A0] bg-[#00E5A0]/10 text-[#00E5A0] font-bold">
                REAL ADITYA-L1 DATA (MAY 10, 2024)
              </span>
            ) : dataSource === 'synthetic_fallback' ? (
              <span className="px-2 py-0.5 rounded border border-[#FFB347] bg-[#FFB347]/10 text-[#FFB347] font-bold">
                SYNTHETIC FALLBACK
              </span>
            ) : dataSource === 'loading' ? (
              <span className="px-2 py-0.5 rounded border border-border-subtle bg-background-tertiary text-text-secondary font-bold animate-pulse">
                LOADING...
              </span>
            ) : isReal ? (
              <span className="px-2 py-0.5 rounded border border-[#00E5A0] bg-[#00E5A0]/10 text-[#00E5A0] font-bold">
                REAL ADITYA-L1 DATA
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded border border-[#FFB347] bg-[#FFB347]/10 text-[#FFB347] font-bold">
                DEMONSTRATION DATA
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 w-full p-2 h-full relative">
          {chartData.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-text-secondary">
              WAITING FOR TELEMETRY...
            </div>
          ) : (
            <div style={{ minHeight: 320, width: '100%', overflowX: 'auto' }}>
              <LineChart width={800} height={320} data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,107,0,0.15)" />
                <XAxis 
                  dataKey="formattedTime" 
                  stroke="#8FA3C0" 
                  fontSize={9}
                  minTickGap={30}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#FFB347" 
                  fontSize={9}
                  tickFormatter={(v) => v > 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(0)}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  scale="log"
                  domain={[1e-9, 1e-3]}
                  stroke="#4FC3F7" 
                  fontSize={9}
                  tickFormatter={(v) => v.toExponential(0)}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {neupertPoint && (
                  <ReferenceLine 
                    x={neupertPoint} 
                    stroke="#FFB347" 
                    strokeDasharray="3 3" 
                    yAxisId="left" 
                    label={{ value: `NEUPERT T-${neupertResult.neupert_delay_minutes}m`, fill: '#FFB347', position: 'top', fontSize: 9 }} 
                  />
                )}

                <Line 
                  isAnimationActive={false}
                  yAxisId="left"
                  type="monotone" 
                  dataKey="hardXray" 
                  stroke="#FFB347" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  isAnimationActive={false}
                  yAxisId="right"
                  type="monotone" 
                  dataKey="softXray" 
                  stroke="#4FC3F7" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
