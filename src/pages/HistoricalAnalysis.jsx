import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DualPayloadChart } from '../components/dashboard/DualPayloadChart';
import { Card } from '../components/ui/Card';
import { gannonStormData } from '../data/gannonStorm';
import { useStore } from '../store/useStore';
import { getGoesFlares } from '../services/api';
import { format, parseISO, subHours } from 'date-fns';
import { Download, AlertCircle, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';

import { SolarCycleContext } from '../components/dashboard/SolarCycleContext';

export function HistoricalAnalysis() {
  const { activityLevel } = useStore();
  
  // Flare Table States
  const [flares, setFlares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCountdown, setRetryCountdown] = useState(30);
  const [classFilter, setClassFilter] = useState('ALL'); // ALL, B, C, M, X
  const [dateRange, setDateRange] = useState('7d'); // 24h, 7d
  const timerRef = useRef(null);

  // Fetch function for flares
  const fetchFlares = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGoesFlares();
      setFlares(data || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching flares in HistoricalAnalysis:", err);
      setError("Data temporarily unavailable");
      setLoading(false);
      setRetryCountdown(30);
    }
  };

  useEffect(() => {
    fetchFlares();
  }, []);

  // Handle countdown when error exists
  useEffect(() => {
    if (error) {
      timerRef.current = setInterval(() => {
        setRetryCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            fetchFlares();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [error]);

  // Derived filtered data
  const filteredFlares = useMemo(() => {
    if (!flares) return [];
    let result = [...flares].reverse(); // Latest first

    // Filter by Date Range
    if (dateRange === '24h') {
      const cutoff = subHours(new Date(), 24);
      result = result.filter(f => {
        if (!f.max_time) return false;
        try {
          return new Date(f.max_time) >= cutoff;
        } catch (e) {
          return false;
        }
      });
    }

    // Filter by Class Pill
    if (classFilter !== 'ALL') {
      result = result.filter(f => {
        const cls = f.max_class || '';
        return cls.toUpperCase().startsWith(classFilter);
      });
    }

    return result;
  }, [flares, classFilter, dateRange]);

  const getPeakFlux = (classStr) => {
    if (!classStr) return '—';
    const match = classStr.match(/^([BCMX])(\d+(\.\d+)?)$/);
    if (!match) return '—';
    const cls = match[1];
    const val = parseFloat(match[2]);
    let base = 1e-7;
    if (cls === 'C') base = 1e-6;
    if (cls === 'M') base = 1e-5;
    if (cls === 'X') base = 1e-4;
    return (val * base).toExponential(1);
  };

  const getDuration = (start, end) => {
    if (!start || !end) return '—';
    try {
      const diffMs = new Date(end) - new Date(start);
      if (isNaN(diffMs)) return '—';
      const mins = Math.round(diffMs / 60000);
      return `${mins}m`;
    } catch (e) {
      return '—';
    }
  };

  const handleExportCSV = () => {
    if (filteredFlares.length === 0) return;
    
    const csvData = filteredFlares.map(f => {
      const durationVal = getDuration(f.begin_time, f.end_time);
      const isMOrAbove = f.max_class && /^[MX]/i.test(f.max_class);
      return {
        "Peak Time (UTC)": f.max_time ? format(parseISO(f.max_time), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
        "Class": f.max_class || 'N/A',
        "Peak Flux (W/m²)": getPeakFlux(f.max_class),
        "Active Region": f.active_region_num ? `AR${f.active_region_num}` : '—',
        "Duration": durationVal,
        "Aditya-L1 Observed": isMOrAbove ? 'OBS' : '—'
      };
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `solar_flares_${dateRange}_${classFilter}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pb-6 pr-2">
      
      {/* Top section (60% height equivalent visual container) */}
      <div className="min-h-[480px] flex flex-col shrink-0">
        <DualPayloadChart 
          data={gannonStormData} 
          title="ADITYA-L1 DUAL PAYLOAD ANALYSIS · GANNON STORM MAY 2024"
        />
      </div>

      <SolarCycleContext />

      {/* Bottom section (40% height equivalent visual container) */}
      <Card title="FLARE EVENT HISTORY LOG" className="flex-1 flex flex-col min-h-[400px]">
        {/* Custom Header Filter Row */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4 pt-2">
          {/* Class Filter Pills */}
          <div className="flex gap-2">
            {['ALL', 'B', 'C', 'M', 'X'].map(cls => (
              <button
                key={cls}
                onClick={() => setClassFilter(cls)}
                className={`px-3 py-1 text-[10px] font-mono border-[0.5px] rounded-sm transition-colors ${
                  classFilter === cls 
                    ? 'bg-background-tertiary border-accent-orange text-accent-orange font-bold' 
                    : 'border-border-subtle text-text-secondary hover:text-text-primary'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>

          {/* Date range toggle & CSV export */}
          <div className="flex items-center gap-3">
            <div className="flex bg-[#020B18] border-[0.5px] border-border-subtle p-0.5 rounded-sm">
              <button
                onClick={() => setDateRange('24h')}
                className={`px-2.5 py-0.5 text-[9px] font-mono rounded-sm transition-colors ${
                  dateRange === '24h' ? 'bg-accent-orange text-black font-bold' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Last 24h
              </button>
              <button
                onClick={() => setDateRange('7d')}
                className={`px-2.5 py-0.5 text-[9px] font-mono rounded-sm transition-colors ${
                  dateRange === '7d' ? 'bg-accent-orange text-black font-bold' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Last 7 days
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              disabled={filteredFlares.length === 0}
              className={`flex items-center gap-2 px-3 py-1 bg-[rgba(255,107,0,0.15)] hover:bg-[rgba(255,107,0,0.3)] border-[0.5px] border-border-emphasis rounded-sm text-accent-orange transition-colors ${
                filteredFlares.length === 0 ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <Download className="w-3 h-3" />
              <span className="font-display text-[10px] uppercase font-medium">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto border-t-[0.5px] border-border-subtle -mx-4 px-4 min-h-[250px] relative">
          
          {loading && (
            <div className="absolute inset-0 bg-background-tertiary/80 z-20 flex flex-col items-center justify-center gap-3">
              <svg className="w-8 h-8 animate-spin text-accent-orange" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="font-mono text-[11px] text-text-primary uppercase tracking-wider">FLARE LOG — ACQUIRING TELEMETRY</span>
              <span className="font-mono text-[10px] text-text-secondary">Data source: /api/goes/flares</span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-background-tertiary/90 z-20 flex flex-col items-center justify-center gap-2 px-4 text-center">
              <AlertCircle className="w-8 h-8 text-accent-red" />
              <span className="font-mono text-xs text-accent-red font-bold">Data temporarily unavailable — retrying in {retryCountdown}s</span>
              <button 
                onClick={fetchFlares}
                className="mt-2 flex items-center gap-1.5 px-3 py-1 bg-accent-red/20 border border-accent-red/40 hover:bg-accent-red/40 rounded-sm text-text-primary text-[10px] font-mono transition-all"
              >
                <RefreshCw className="w-3 h-3" /> Retry Now
              </button>
            </div>
          )}

          {!loading && !error && filteredFlares.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-background-tertiary">
              <div className="border border-border-subtle bg-[#020B18] px-4 py-3 rounded text-center max-w-md">
                <p className="font-mono text-xs text-text-secondary leading-relaxed">
                  No {classFilter !== 'ALL' ? classFilter + '-class' : ''} events in the last {dateRange === '24h' ? '24 hours' : '7 days'}.
                </p>
                <p className="font-mono text-xs text-text-secondary mt-1">
                  Solar activity is currently <span className="text-accent-orange font-bold">{activityLevel}</span>.
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-background-tertiary z-10 border-b-[0.5px] border-border-subtle">
                <tr>
                  <th className="px-4 py-3 font-display text-xs text-text-secondary font-medium tracking-wider uppercase">Peak Time (UTC)</th>
                  <th className="px-4 py-3 font-display text-xs text-text-secondary font-medium tracking-wider uppercase">Class</th>
                  <th className="px-4 py-3 font-display text-xs text-text-secondary font-medium tracking-wider uppercase">Peak Flux (W/m²)</th>
                  <th className="px-4 py-3 font-display text-xs text-text-secondary font-medium tracking-wider uppercase">Active Region</th>
                  <th className="px-4 py-3 font-display text-xs text-text-secondary font-medium tracking-wider uppercase">Duration</th>
                  <th className="px-4 py-3 font-display text-xs text-text-secondary font-medium tracking-wider uppercase text-right">Aditya-L1</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlares.map((f, i) => {
                  const durationVal = getDuration(f.begin_time, f.end_time);
                  const isMOrAbove = f.max_class && /^[MX]/i.test(f.max_class);
                  
                  return (
                    <tr 
                      key={i}
                      className="border-b-[0.5px] border-border-subtle/30 hover:bg-background-secondary transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-text-primary">
                        {f.max_time ? format(parseISO(f.max_time), 'yyyy-MM-dd HH:mm:ss') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          f.max_class?.startsWith('X') ? 'bg-accent-red/20 border border-accent-red/40 text-accent-red' :
                          f.max_class?.startsWith('M') ? 'bg-accent-amber/20 border border-accent-amber/40 text-accent-amber' :
                          f.max_class?.startsWith('C') ? 'bg-[#4FC3F7]/20 border border-[#4FC3F7]/40 text-[#4FC3F7]' :
                          'bg-text-secondary/20 border border-text-secondary/40 text-text-secondary'
                        }`}>
                          {f.max_class || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-primary">
                        {getPeakFlux(f.max_class)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                        {f.active_region_num ? `AR${f.active_region_num}` : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                        {durationVal}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isMOrAbove ? (
                          <span className="px-2.5 py-0.5 rounded border border-accent-green bg-accent-green/10 text-accent-green font-mono text-[9px] font-bold">
                            OBS
                          </span>
                        ) : (
                          <span className="text-text-secondary font-mono text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
