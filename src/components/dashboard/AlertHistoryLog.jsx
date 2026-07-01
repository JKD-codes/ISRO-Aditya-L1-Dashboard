import React, { useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import useMLStore from '../../store/useMLStore';
import { useStore } from '../../store/useStore';
import { Download, Check, Minus } from 'lucide-react';

export function AlertHistoryLog({ filterClass = 'ALL' }) {
  const { alertHistory, addAlertToHistory, modelConfidence, neupertResult } = useMLStore();
  const { activeAlert } = useStore();
  const processedAlerts = useRef(new Set());

  // Listen for new alerts and add to history
  useEffect(() => {
    if (activeAlert && !processedAlerts.current.has(activeAlert.id)) {
      processedAlerts.current.add(activeAlert.id);
      
      const newEntry = {
        id: activeAlert.id,
        timestamp: new Date().toISOString(),
        flareClass: activeAlert.class,
        region: activeAlert.region,
        confidence: modelConfidence || 85, // Use ML confidence or fallback
        neupertConfirmed: neupertResult?.confirmed || false
      };
      
      addAlertToHistory(newEntry);
    }
  }, [activeAlert, addAlertToHistory, modelConfidence, neupertResult]);

  const exportCSV = () => {
    if (alertHistory.length === 0) return;
    
    const headers = ['Timestamp', 'Flare Class', 'Active Region', 'ML Confidence (%)', 'Neupert Confirmed'];
    const rows = alertHistory.map(alert => [
      alert.timestamp,
      alert.flareClass,
      alert.region,
      alert.confidence,
      alert.neupertConfirmed ? 'Yes' : 'No'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `aditya_l1_alerts_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getClassColor = (cls) => {
    if (cls.startsWith('X')) return 'text-[#FF3B3B] bg-[#FF3B3B]/10 border-[#FF3B3B]/30';
    if (cls.startsWith('M')) return 'text-[#FFB347] bg-[#FFB347]/10 border-[#FFB347]/30';
    if (cls.startsWith('C')) return 'text-[#FDE047] bg-[#FDE047]/10 border-[#FDE047]/30';
    return 'text-[#8FA3C0] bg-[#8FA3C0]/10 border-[#8FA3C0]/30';
  };

  const filteredHistory = alertHistory.filter(alert => 
    filterClass === 'ALL' || (alert.flareClass && alert.flareClass.startsWith(filterClass))
  );

  return (
    <Card className="flex flex-col h-full overflow-hidden" p={0} title="ALERT HISTORY LOG">
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {filteredHistory.length === 0 ? (
          <div className="flex h-full items-center justify-center text-text-secondary font-mono text-xs uppercase tracking-widest">
            NO ALERTS DETECTED
          </div>
        ) : (
          filteredHistory.map((alert, i) => (
            <div key={alert.id || i} className="flex items-center justify-between bg-[#01050A] border border-border-subtle p-2 rounded-sm hover:border-white/20 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-text-secondary">
                  {(alert.timestamp || alert.time || '').substring(11, 19)} UTC
                </span>
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-sm border font-bold ${getClassColor(alert.flareClass || '')}`}>
                  {alert.flareClass || 'UNKNOWN'}
                </span>
                <span className="font-mono text-[10px] text-text-primary">
                  {alert.region ? `AR${alert.region}` : ''}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[9px] text-text-secondary uppercase">Conf</span>
                  <span className="font-mono text-[10px] text-[#00E5A0]">{alert.confidence}%</span>
                </div>
                <div className="flex items-center gap-1" title="Neupert Effect Confirmed">
                  <span className="font-mono text-[9px] text-text-secondary uppercase">Neupert</span>
                  {alert.neupertConfirmed ? (
                    <Check className="w-3 h-3 text-[#00E5A0]" />
                  ) : (
                    <Minus className="w-3 h-3 text-text-secondary" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="p-2 border-t-[0.5px] border-border-subtle bg-[#01050A] shrink-0">
        <button 
          onClick={exportCSV}
          disabled={alertHistory.length === 0}
          className="w-full flex items-center justify-center gap-2 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-text-primary font-mono text-[10px] tracking-widest transition-colors rounded-sm border border-white/10"
        >
          <Download className="w-3 h-3" />
          EXPORT CSV LOG
        </button>
      </div>
    </Card>
  );
}
