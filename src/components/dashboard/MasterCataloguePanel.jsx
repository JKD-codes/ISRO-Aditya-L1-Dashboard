import React, { useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import useMLStore from '../../store/useMLStore';
import { Download, Filter, Database } from 'lucide-react';
import AnimatedCounter from '../ui/AnimatedCounter';
import Papa from 'papaparse';
import { format } from 'date-fns';

export function MasterCataloguePanel() {
  const masterCatalogue = useMLStore(state => state.masterCatalogue);
  const catalogueStats = useMLStore(state => state.catalogueStats);
  const [classFilter, setClassFilter] = useState('ALL');
  const [showCrossValidatedOnly, setShowCrossValidatedOnly] = useState(false);

  const filteredEvents = useMemo(() => {
    let events = masterCatalogue || [];

    if (classFilter !== 'ALL') {
      events = events.filter(e => (e.flare_class || '').toUpperCase().startsWith(classFilter));
    }

    if (showCrossValidatedOnly) {
      events = events.filter(e => e.cross_validated);
    }

    return events;
  }, [masterCatalogue, classFilter, showCrossValidatedOnly]);

  const handleExportCSV = () => {
    if (filteredEvents.length === 0) return;

    const csvData = filteredEvents.map(e => ({
      'Detection Time (UTC)': e.detection_time || '',
      'Flare Class': e.flare_class || '',
      'SoLEXS Detected': e.solexs_detected ? 'YES' : 'NO',
      'HEL1OS Detected': e.helios_detected ? 'YES' : 'NO',
      'Cross-Validated': e.cross_validated ? 'YES' : 'NO',
      'Combined Confidence': ((e.combined_confidence || 0) * 100).toFixed(1) + '%',
      'SoLEXS Flux (W/m²)': e.solexs_flux?.toExponential(2) || '—',
      'HEL1OS Counts (c/s)': e.helios_counts || '—',
      'Neupert Confirmed': e.neupert_confirmed ? 'YES' : 'NO',
      'Neupert Correlation': (e.neupert_correlation || 0).toFixed(3),
      'Lead Time (min)': (e.lead_time_min || 0).toFixed(1),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `master_catalogue_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = catalogueStats || { total_events: 0, cross_validated: 0, by_class: {} };

  return (
    <Card title="AUTOMATED MASTER FLARE CATALOGUE" className="flex flex-col"
      headerRight={
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-mono text-[9px] text-purple-300">SQLite-backed</span>
        </div>
      }
    >
      {/* Stats Row */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        <div className="text-center">
          <span className="font-mono text-[9px] text-text-secondary block">TOTAL</span>
          <span className="font-mono text-lg font-bold text-text-primary">
            <AnimatedCounter value={stats.total_events} />
          </span>
        </div>
        <div className="text-center">
          <span className="font-mono text-[9px] text-text-secondary block">CONFIRMED</span>
          <span className="font-mono text-lg font-bold text-green-400">
            <AnimatedCounter value={stats.cross_validated} />
          </span>
        </div>
        {['B', 'C', 'M', 'X'].map(cls => (
          <div key={cls} className="text-center">
            <span className="font-mono text-[9px] text-text-secondary block">{cls}-CLASS</span>
            <span className={`font-mono text-lg font-bold ${
              cls === 'X' ? 'text-[#FF3B3B]' :
              cls === 'M' ? 'text-[#FFB347]' :
              cls === 'C' ? 'text-[#4FC3F7]' :
              'text-[#8FA3C0]'
            }`}>
              <AnimatedCounter value={stats.by_class?.[cls] || 0} />
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-3 pb-3 border-b border-border-subtle">
        <div className="flex gap-2">
          {['ALL', 'B', 'C', 'M', 'X'].map(cls => (
            <button key={cls} onClick={() => setClassFilter(cls)}
              className={`px-3 py-1 text-[10px] font-mono border-[0.5px] rounded-sm transition-colors ${
                classFilter === cls
                  ? 'bg-background-tertiary border-accent-orange text-accent-orange font-bold'
                  : 'border-border-subtle text-text-secondary hover:text-text-primary'
              }`}
            >{cls}</button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="accent-accent-orange"
              checked={showCrossValidatedOnly}
              onChange={(e) => setShowCrossValidatedOnly(e.target.checked)}
            />
            <span className="font-mono text-[10px] text-text-secondary">Cross-validated only</span>
          </label>

          <button onClick={handleExportCSV}
            disabled={filteredEvents.length === 0}
            className={`flex items-center gap-2 px-3 py-1 bg-[rgba(255,107,0,0.15)] hover:bg-[rgba(255,107,0,0.3)] border-[0.5px] border-border-emphasis rounded-sm text-accent-orange transition-colors ${
              filteredEvents.length === 0 ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <Download className="w-3 h-3" />
            <span className="font-display text-[10px] uppercase font-medium">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto max-h-[400px]">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Database className="w-8 h-8 text-text-secondary mb-3 opacity-30" />
            <span className="font-mono text-xs text-text-secondary">No events in catalogue yet.</span>
            <span className="font-mono text-[10px] text-text-secondary mt-1">
              Events are added automatically when the pipeline detects flare activity.
            </span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-background-tertiary z-10 border-b border-border-subtle">
              <tr>
                <th className="px-3 py-2 font-display text-[10px] text-text-secondary font-medium tracking-wider uppercase">Time (UTC)</th>
                <th className="px-3 py-2 font-display text-[10px] text-text-secondary font-medium tracking-wider uppercase">Class</th>
                <th className="px-3 py-2 font-display text-[10px] text-text-secondary font-medium tracking-wider uppercase">SoLEXS</th>
                <th className="px-3 py-2 font-display text-[10px] text-text-secondary font-medium tracking-wider uppercase">HEL1OS</th>
                <th className="px-3 py-2 font-display text-[10px] text-text-secondary font-medium tracking-wider uppercase">X-Val</th>
                <th className="px-3 py-2 font-display text-[10px] text-text-secondary font-medium tracking-wider uppercase">Neupert</th>
                <th className="px-3 py-2 font-display text-[10px] text-text-secondary font-medium tracking-wider uppercase text-right">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((e, i) => (
                <tr key={e.id || i} className="border-b-[0.5px] border-border-subtle/30 hover:bg-background-secondary transition-colors">
                  <td className="px-3 py-2 font-mono text-[10px] text-text-primary">
                    {e.detection_time || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                      (e.flare_class || '').startsWith('X') ? 'bg-[#FF3B3B]/20 border border-[#FF3B3B]/40 text-[#FF3B3B]' :
                      (e.flare_class || '').startsWith('M') ? 'bg-[#FFB347]/20 border border-[#FFB347]/40 text-[#FFB347]' :
                      (e.flare_class || '').startsWith('C') ? 'bg-[#4FC3F7]/20 border border-[#4FC3F7]/40 text-[#4FC3F7]' :
                      'bg-[#8FA3C0]/20 border border-[#8FA3C0]/40 text-[#8FA3C0]'
                    }`}>{e.flare_class || '?'}</span>
                  </td>
                  <td className="px-3 py-2">
                    {e.solexs_detected ? (
                      <span className="text-[#4FC3F7] font-mono text-[9px] font-bold">✓</span>
                    ) : (
                      <span className="text-gray-500 font-mono text-[9px]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {e.helios_detected ? (
                      <span className="text-[#FFB347] font-mono text-[9px] font-bold">✓</span>
                    ) : (
                      <span className="text-gray-500 font-mono text-[9px]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {e.cross_validated ? (
                      <span className="px-1.5 py-0.5 bg-green-900/20 text-green-400 border border-green-500/20 rounded text-[9px] font-mono font-bold">
                        CONFIRMED
                      </span>
                    ) : (
                      <span className="text-gray-500 font-mono text-[9px]">SINGLE</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {e.neupert_confirmed ? (
                      <span className="text-green-400 font-mono text-[9px] font-bold">✓ r={e.neupert_correlation?.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-500 font-mono text-[9px]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[10px] text-text-primary">
                    {((e.combined_confidence || 0) * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
