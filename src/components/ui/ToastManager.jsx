import React, { useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import useMLStore from '../../store/useMLStore';

export function ToastManager() {
  const { activeAlert, wsStatus } = useStore();
  const { neupertResult } = useMLStore();
  
  const prevAlert = useRef(null);
  const prevNeupert = useRef(null);
  const prevWs = useRef('connecting');

  // Flare Alert Toasts
  useEffect(() => {
    if (activeAlert && activeAlert.id !== prevAlert.current) {
      prevAlert.current = activeAlert.id;
      
      let color = '#FFB347'; // M class default
      if (activeAlert.class.startsWith('X')) color = '#FF3B3B';
      if (activeAlert.class.startsWith('C')) color = '#FDE047';

      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-[#020B18] shadow-2xl rounded-sm pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-[${color}]/50 p-4`}>
          <div className="flex-1 w-0">
            <div className="flex items-center">
              <div className="flex-shrink-0 pt-0.5 text-2xl">
                ⚡
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-[12px] font-mono font-bold tracking-widest text-[${color}] uppercase`}>
                  {activeAlert.class} FLARE DETECTED
                </p>
                <p className="mt-1 text-[11px] font-mono text-text-secondary">
                  Active Region: {activeAlert.region} · Probability: {Math.round(activeAlert.probability * 100)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 8000 });
    }
  }, [activeAlert]);

  // Neupert Effect Toasts
  useEffect(() => {
    if (neupertResult?.confirmed && neupertResult.time !== prevNeupert.current) {
      prevNeupert.current = neupertResult.time; // use time as id
      
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-[#020B18] shadow-2xl rounded-sm pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-[#c084fc]/50 p-4`}>
          <div className="flex-1 w-0">
            <div className="flex items-center">
              <div className="flex-shrink-0 pt-0.5 text-[#c084fc]">
                📈
              </div>
              <div className="ml-3 flex-1">
                <p className="text-[12px] font-mono font-bold tracking-widest text-[#c084fc] uppercase">
                  NEUPERT EFFECT DETECTED
                </p>
                <p className="mt-1 text-[11px] font-mono text-purple-300/80">
                  HEL1OS led SoLEXS by {neupertResult.lead_mins || 3} min
                </p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 6000 });
    }
  }, [neupertResult]);

  // WebSocket Reconnect Toast
  useEffect(() => {
    if (wsStatus === 'connected' && prevWs.current !== 'connected' && prevWs.current !== 'connecting') {
      toast.success('Live feed reconnected', {
        duration: 3000,
        style: {
          background: '#020B18',
          color: '#00E5A0',
          border: '1px solid rgba(0,229,160,0.3)',
          fontFamily: 'monospace',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        },
        iconTheme: {
          primary: '#00E5A0',
          secondary: '#020B18',
        },
      });
    }
    prevWs.current = wsStatus;
  }, [wsStatus]);

  return <Toaster position="bottom-left" reverseOrder={false} />;
}
