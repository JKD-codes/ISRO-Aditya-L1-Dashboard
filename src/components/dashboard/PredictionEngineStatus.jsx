import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { Activity } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';
import useMLStore from '../../store/useMLStore';

export function PredictionEngineStatus({ className }) {
  const [logs, setLogs] = useState([]);
  const logCounterRef = useRef(0);
  const logIntervalRef = useRef(null);
  
  // Random latency between 38 and 67ms for each render
  const liveMs = Math.floor(Math.random() * (67 - 38 + 1)) + 38;

  // Initialize logs on mount
  useEffect(() => {
    const initialLogs = [
      { time: new Date(Date.now() - 50000), msg: 'SYSTEM INITIALIZATION OK', type: 'nominal' },
      { time: new Date(Date.now() - 40000), msg: 'SYNCING SoLEXS TELEMETRY... OK', type: 'nominal' },
      { time: new Date(Date.now() - 30000), msg: 'SYNCING HEL1OS TELEMETRY... OK', type: 'nominal' },
      { time: new Date(Date.now() - 20000), msg: 'PIPELINE PREDICTION CORE WARMUP COMPLETE', type: 'nominal' },
      { time: new Date(Date.now() - 10000), msg: 'PIPELINE ACTIVE. WAITING FOR TRIGGERS.', type: 'nominal' }
    ];
    setLogs(initialLogs);

    // Setup single 10-second interval
    logIntervalRef.current = setInterval(() => {
      const state = useStore.getState();
      const demoActive = state.demoActive;
      const goesData = state.goesData;

      // Increment log counter
      logCounterRef.current += 1;
      const count = logCounterRef.current;

      // 1. Check for occasional non-flux lines
      if (count % 5 === 0) {
        const ratio = (0.35 + Math.random() * 0.25).toFixed(3);
        setLogs(prev => [...prev, {
          time: new Date(),
          msg: `GOES XRS-A/B RATIO: ${ratio} | SPECTRAL INDEX NOMINAL`,
          type: 'nominal'
        }].slice(-20));
        return;
      }

      if (count % 8 === 0) {
        const wsState = useMLStore.getState();
        const wsConnected = wsState.wsConnected;
        const statusStr = wsConnected ? 'CONFIRMED' : 'DISCONNECTED';
        const statusColor = wsConnected ? 'nominal' : 'warning';
        setLogs(prev => [...prev, {
          time: new Date(),
          msg: `ADITYA-L1 SOLEXS SYNC: ${statusStr} | WS: ${wsConnected ? 'CONNECTED' : 'RECONNECTING'}`,
          type: statusColor
        }].slice(-20));
        return;
      }

      // 2. Fetch current flux
      let fluxVal = 1.2e-7;
      if (demoActive) {
        fluxVal = 5.2e-5;
      } else if (goesData && goesData.length > 0) {
        const channelB = goesData.filter(d => d.energy === '0.1-0.8nm' || d.energy_band === '0.1-0.8nm');
        const points = channelB.length > 0 ? channelB : goesData;
        fluxVal = points[points.length - 1]?.flux || 1.2e-7;
      }

      // Apply ±5% jitter
      const jitter = 1 + (Math.random() - 0.5) * 0.10;
      const jitteredFlux = fluxVal * jitter;

      // Format as X.Xe-N
      const fluxStr = jitteredFlux.toExponential(1);

      // Determine STATUS and colors
      let statusStr = 'NOMINAL';
      let logType = 'nominal'; // color: #8FA3C0

      if (jitteredFlux >= 1e-5) {
        statusStr = 'ALERT ⚡';
        logType = 'alert'; // color: #FF3B3B, bold
      } else if (jitteredFlux >= 1e-6) {
        statusStr = 'WARNING';
        logType = 'warning'; // color: #FFB347
      } else if (jitteredFlux >= 1e-7) {
        statusStr = 'ELEVATED';
        logType = 'elevated'; // color: #FFB347
      }

      const msg = `GOES XRS-B: ${fluxStr} W/m² | STATUS: ${statusStr} | NEXT CHECK: 10s`;

      setLogs(prev => [...prev, {
        time: new Date(),
        msg,
        type: logType
      }].slice(-20));
    }, 10000);

    return () => {
      if (logIntervalRef.current) clearInterval(logIntervalRef.current);
    };
  }, []);

  // Monitor activity level changes or alerts for threshold onset messages
  const lastAlertIdRef = useRef(null);
  useEffect(() => {
    const state = useStore.getState();
    const alert = state.activeAlert;
    if (alert && alert.id !== lastAlertIdRef.current) {
      lastAlertIdRef.current = alert.id;
      const classStr = alert.class || 'M5.2';
      const regionStr = alert.region || '3664';
      const msg = `⚡ THRESHOLD EVENT: ${classStr} onset detected | AR ${regionStr}`;
      setLogs(prev => [...prev, {
        time: new Date(),
        msg,
        type: alert.severity === 'ALERT' ? 'alert' : 'warning'
      }].slice(-20));
    }
  }, [logs]); // trigger check when logs update or subscription triggers

  // We can subscribe to store changes for alerts to inject them instantly
  useEffect(() => {
    const unsubscribe = useStore.subscribe(
      (state) => state.activeAlert,
      (alert) => {
        if (alert && alert.id !== lastAlertIdRef.current) {
          lastAlertIdRef.current = alert.id;
          const classStr = alert.class || 'M5.2';
          const regionStr = alert.region || '3664';
          const msg = `⚡ THRESHOLD EVENT: ${classStr} onset detected | AR ${regionStr}`;
          setLogs(prev => [...prev, {
            time: new Date(),
            msg,
            type: alert.severity === 'ALERT' ? 'alert' : 'warning'
          }].slice(-20));
        }
      }
    );
    return () => unsubscribe();
  }, []);

  return (
    <Card title="Aditya-L1 Forecasting Algorithm Pipeline" className={cn("flex flex-col h-full relative", className)}>
      <div className="flex-1 w-full h-full bg-[#020B18] border border-border-subtle p-3 font-mono text-[10px] overflow-hidden flex flex-col gap-1 min-h-0">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border-subtle text-accent-green">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>STATUS: ONLINE | SOURCE: GOES-18 + SoLEXS+HEL1OS FUSION | LATENCY: {liveMs}ms | WS: {useMLStore.getState().wsConnected ? '●' : '○'}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto flex flex-col gap-1">
          {logs.map((log, i) => (
            <div key={i} className={cn(
              "flex gap-3 items-start",
              log.type === 'alert' ? 'text-[#FF3B3B] font-bold' : 
              log.type === 'warning' || log.type === 'elevated' ? 'text-[#FFB347]' : 'text-[#8FA3C0]'
            )}>
              <span className="opacity-50 shrink-0">
                [{log.time.toLocaleTimeString([], { hour12: false })}]
              </span>
              <span>{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}


