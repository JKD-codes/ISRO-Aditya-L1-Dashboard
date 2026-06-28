import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGoesFlares } from '../../services/api';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useStore } from '../../store/useStore';
import { format, parseISO } from 'date-fns';
import Papa from 'papaparse';
import { Download } from 'lucide-react';

export function FlareEventLog() {
  const { data: flares, isLoading } = useQuery({
    queryKey: ['goesFlares'],
    queryFn: getGoesFlares,
    refetchInterval: 300000, // 5 min
  });

  const { flareEventFilters, setFlareEventFilters, selectedActiveRegion } = useStore();

  const filteredFlares = useMemo(() => {
    if (!flares) return [];
    
    let filtered = [...flares].reverse(); // newest first
    
    // Process and add mock "Aditya-L1 observed" flag (say any flare in May 2024 was observed)
    filtered = filtered.map(f => {
       const isMay2024 = f.begin_time && f.begin_time.startsWith('2024-05');
       return {
           ...f,
           adityaObserved: isMay2024,
           // Clean class e.g., M5.2
           displayClass: f.max_class || 'Unknown'
       };
    });

    if (flareEventFilters.class !== 'ALL') {
      filtered = filtered.filter(f => f.displayClass.startsWith(flareEventFilters.class));
    }
    
    if (flareEventFilters.adityaObservedOnly) {
      filtered = filtered.filter(f => f.adityaObserved);
    }
    
    if (selectedActiveRegion) {
        // Just highlight it or filter it? Let's just filter it for demo if selected.
        // Wait, prompt says "highlights that region's flare events in the history chart". 
        // We'll just highlight the row if it matches, no hard filter.
    }

    return filtered.slice(0, 50); // limit to 50 for performance
  }, [flares, flareEventFilters, selectedActiveRegion]);

  const handleExportCSV = () => {
    if (filteredFlares.length === 0) return;
    
    const csv = Papa.unparse(filteredFlares.map(f => ({
        BeginTime: f.begin_time,
        PeakTime: f.max_time,
        EndTime: f.end_time,
        Class: f.displayClass,
        ActiveRegion: f.active_region_num,
        AdityaObserved: f.adityaObserved ? 'YES' : 'NO'
    })));
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `flare_events_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card title="Flare Event History Log" className="flex-1 flex flex-col h-full min-h-[400px]">
      <div className="flex justify-between items-center mb-4 px-2 pt-2">
        <div className="flex gap-2">
            {['ALL', 'B', 'C', 'M', 'X'].map(cls => (
                <button
                   key={cls}
                   onClick={() => setFlareEventFilters({ class: cls })}
                   className={`px-3 py-1 text-[10px] font-mono border-[0.5px] rounded-sm transition-colors ${
                       flareEventFilters.class === cls 
                       ? 'bg-background-tertiary border-accent-orange text-accent-orange' 
                       : 'border-border-subtle text-text-secondary hover:text-text-primary'
                   }`}
                >
                   {cls}
                </button>
            ))}
        </div>
        
        <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
               <input 
                  type="checkbox" 
                  className="accent-accent-orange bg-background-tertiary"
                  checked={flareEventFilters.adityaObservedOnly}
                  onChange={(e) => setFlareEventFilters({ adityaObservedOnly: e.target.checked })}
               />
               <span className="font-mono text-[10px] text-text-secondary">Aditya-L1 Observed</span>
            </label>
            
            <button 
               onClick={handleExportCSV}
               className="flex items-center gap-2 px-3 py-1 bg-[rgba(255,107,0,0.15)] hover:bg-[rgba(255,107,0,0.3)] border-[0.5px] border-border-emphasis rounded-sm text-accent-orange transition-colors"
            >
               <Download className="w-3 h-3" />
               <span className="font-display text-[10px] uppercase font-medium">Export CSV</span>
            </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto border-t-[0.5px] border-border-subtle -mx-4 px-4">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-background-tertiary z-10">
            <tr className="border-b-[0.5px] border-border-subtle">
              <th className="px-4 py-2 font-display text-xs text-text-secondary font-medium tracking-wider uppercase">Datetime (UTC)</th>
              <th className="px-4 py-2 font-display text-xs text-text-secondary font-medium tracking-wider uppercase">Class</th>
              <th className="px-4 py-2 font-display text-xs text-text-secondary font-medium tracking-wider uppercase">Region</th>
              <th className="px-4 py-2 font-display text-xs text-text-secondary font-medium tracking-wider uppercase text-right">Aditya-L1</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="4" className="text-center py-8 text-xs font-mono text-text-secondary">LOADING EVENTS...</td></tr>
            ) : filteredFlares.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-8 text-xs font-mono text-text-secondary">NO EVENTS FOUND</td></tr>
            ) : (
              filteredFlares.map((f, i) => (
                <tr 
                  key={i}
                  className={`border-b-[0.5px] border-border-subtle/50 transition-colors ${
                      selectedActiveRegion === String(f.active_region_num) ? 'bg-[rgba(255,107,0,0.1)]' : 'hover:bg-background-secondary'
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-text-primary">
                      {f.max_time ? format(parseISO(f.max_time), 'yyyy-MM-dd HH:mm') : 'N/A'}
                  </td>
                  <td className="px-4 py-3">
                      <Badge flareClass={f.displayClass[0]}>{f.displayClass}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                      {f.active_region_num ? `AR${f.active_region_num}` : 'Unassigned'}
                  </td>
                  <td className="px-4 py-3 text-right">
                      {f.adityaObserved ? (
                          <span className="px-2 py-0.5 rounded-full border-[0.5px] border-accent-green bg-[rgba(0,229,160,0.1)] text-accent-green font-mono text-[10px]">YES</span>
                      ) : (
                          <span className="px-2 py-0.5 rounded-full border-[0.5px] border-border-subtle text-text-secondary font-mono text-[10px]">NO</span>
                      )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
