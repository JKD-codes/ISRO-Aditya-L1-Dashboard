import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSolarRegions, getSdoLatestUrl } from '../../services/api';
import { Card } from '../ui/Card';
import { Crosshair } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';

export function SolarDisk({ className }) {
  const [timestamp, setTimestamp] = useState(Date.now());
  const [imgFailed, setImgFailed] = useState(false);

  // Refresh image every 15 minutes on the frontend (cache-busting)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(Date.now());
      setImgFailed(false);
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const imageUrl = `${getSdoLatestUrl()}?t=${timestamp}`;

  // Fetch live solar regions
  const { data: regionsData } = useQuery({
    queryKey: ['solarRegions'],
    queryFn: getSolarRegions,
    refetchInterval: 300000, // 5 minutes
  });

  const { selectedActiveRegion } = useStore();

  // Heliographic coordinate mapping
  const activeRegions = useMemo(() => {
    // Fallback static regions if API is empty or loading
    const defaultRegions = [
      { number: '3664', coordinate: 'N18E07', class: 'X' },
      { number: '3663', coordinate: 'S10W22', class: 'M' },
      { number: '3665', coordinate: 'N05E45', class: 'C' }
    ];

    const source = (regionsData && regionsData.length > 0) ? regionsData : defaultRegions;

    return source.map(r => {
      const coordStr = r.coordinate || '';
      const match = coordStr.match(/^([NS])(\d+)([EW])(\d+)$/i);
      if (!match) return null;

      const latDir = match[1].toUpperCase();
      const latVal = parseFloat(match[2]);
      const lonDir = match[3].toUpperCase();
      const lonVal = parseFloat(match[4]);

      const latitude = latDir === 'N' ? latVal : -latVal;
      // West is positive, East is negative
      const longitude = lonDir === 'W' ? lonVal : -lonVal;

      // Coordinate mapping formula:
      // x = (image_width / 2) + (longitude * image_width / 360)
      // y = (image_height / 2) - (latitude * image_height / 180)
      // Convert to percent values:
      const left = 50 + (longitude * 100 / 180); // Scaled for visual centering on SDO disk
      const top = 50 - (latitude * 100 / 180);

      return {
        id: r.number || r.region || 'AR',
        coordinate: coordStr,
        top: `${Math.max(10, Math.min(90, top))}%`,
        left: `${Math.max(10, Math.min(90, left))}%`,
        class: r.class || 'C'
      };
    }).filter(Boolean);
  }, [regionsData]);

  return (
    <Card title="AIA 193Å Solar Disk Monitor" className={cn("flex flex-col relative", className)} withScanLine>
      <div className="flex-1 w-full relative bg-black flex items-center justify-center overflow-hidden min-h-[250px] rounded-sm">
        {imgFailed ? (
          <div className="flex flex-col items-center justify-center gap-4 w-full h-full bg-[#020B18]">
            <span className="font-mono text-[10px] text-[#FF3B3B] font-bold tracking-widest text-center px-4">
              SDO IMAGE UNAVAILABLE — NASA SERVER UNREACHABLE
            </span>
            <button 
              onClick={() => { setTimestamp(Date.now()); setImgFailed(false); }}
              className="border border-[#FF3B3B]/50 text-[#FF3B3B] px-3 py-1 font-mono text-[9px] hover:bg-[#FF3B3B]/10 transition-colors"
            >
              RETRY CONNECTION
            </button>
          </div>
        ) : (
          <img 
            src={imageUrl} 
            alt="SDO AIA 193" 
            className="object-contain max-h-full max-w-full opacity-90 mix-blend-screen"
            onError={(e) => { e.target.style.display='none'; setImgFailed(true); }}
            onLoad={(e) => { e.target.style.display='block'; setImgFailed(false); }}
          />
        )}

        {/* Dynamic Coordinate-Mapped Reticles */}
        <div className="absolute inset-0 pointer-events-none">
          {activeRegions.map((region, idx) => {
            const isStorm = region.class === 'X' || region.id === '3664' || String(region.id) === '3664';
            const isWarning = region.class === 'M';
            const isSelected = String(selectedActiveRegion) === String(region.id);

            return (
              <div 
                key={idx} 
                className={cn(
                  "absolute w-12 h-12 -ml-6 -mt-6 border flex items-center justify-center transition-all duration-1000",
                  isSelected ? "border-2 animate-pulse shadow-[0_0_15px_rgba(255,107,0,0.8)]" : "border-[0.5px]"
                )}
                style={{
                  top: region.top,
                  left: region.left,
                  borderColor: isSelected ? '#FF6B00' : (isStorm ? '#FF3B3B' : isWarning ? '#FFB347' : '#00E5A0')
                }}
              >
                <div 
                  className={cn(
                    "absolute -top-4 text-[9px] font-mono font-bold whitespace-nowrap",
                    isSelected ? "text-accent-orange scale-110" : (isStorm ? "text-[#FF3B3B]" : isWarning ? "text-[#FFB347]" : "text-[#00E5A0]")
                  )}
                >
                  AR{region.id}
                </div>
                <div 
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isSelected ? "bg-accent-orange animate-ping scale-125" : (isStorm ? "bg-[#FF3B3B] animate-ping" : isWarning ? "bg-[#FFB347]" : "bg-[#00E5A0]")
                  )} 
                />
              </div>
            );
          })}
        </div>

        {/* HUD Elements */}
        <div className="absolute bottom-2 left-2 flex items-center gap-2 opacity-70">
          <Crosshair className="w-3.5 h-3.5 text-accent-orange" />
          <span className="font-mono text-[9px] text-accent-orange uppercase tracking-wider">Targeting Online</span>
        </div>
        
        <div className="absolute top-2 right-2 flex flex-col items-end gap-0.5 opacity-70">
          <span className="font-mono text-[8px] text-text-secondary">WAVELENGTH: 193 Å</span>
          <span className="font-mono text-[8px] text-text-secondary">SOURCE: NASA SDO</span>
        </div>
      </div>
    </Card>
  );
}
export default SolarDisk;
