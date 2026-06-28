import React, { useEffect, useRef, useState } from 'react';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';
import { SolarParticles } from './SolarParticles';
import { Layers } from 'lucide-react';

export function SolarSimulation() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { demoActive, activeRegions, activeAlert } = useStore();
  const [sdoImage, setSdoImage] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [filterMode, setFilterMode] = useState('AIA'); // AIA, HEL1OS, SoLEXS

  // Helioviewer API fetch (Optional SDO overlay)
  useEffect(() => {
    let mounted = true;
    const fetchHelioviewerImage = async () => {
      try {
        const dateStr = new Date().toISOString().slice(0, 19) + 'Z';
        const res = await fetch(`https://api.helioviewer.org/v2/getClosestImage/?sourceId=10&date=${dateStr}`);
        const data = await res.json();
        
        if (mounted && data && data.id) {
          const imgUrl = `https://api.helioviewer.org/v2/downloadFile/?id=${data.id}`;
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => { if (mounted) setSdoImage(img); };
          img.onerror = () => { if (mounted) setImageFailed(true); };
          img.src = imgUrl;
        } else if (mounted) {
          setImageFailed(true);
        }
      } catch (err) {
        if (mounted) setImageFailed(true);
      }
    };
    
    const timeout = setTimeout(() => {
      if (mounted && !sdoImage) setImageFailed(true);
    }, 5000);

    fetchHelioviewerImage();
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  // WebGL / Canvas Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    let animationFrameId;
    let frame = 0;

    // Granulation Texture setup
    const granules = Array.from({ length: 800 }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      r: Math.random() * 6 + 2,
      brightness: Math.random() * 0.4 + 0.6,
      lifespan: Math.random() * 400 + 200,
      age: Math.random() * 600
    }));

    // Corona setup
    const streamers = Array.from({ length: 12 }, (_, i) => ({
      angle: (i / 12) * Math.PI * 2 + Math.random() * 0.5,
      length: 1.3 + Math.random() * 0.4,
      width: 0.08 + Math.random() * 0.1,
      opacity: 0.04 + Math.random() * 0.06
    }));

    const hgToCanvas = (lat_deg, lon_deg, canvas_cx, canvas_cy, disk_radius) => {
      const lat_rad = lat_deg * Math.PI / 180;
      const lon_rad = lon_deg * Math.PI / 180;
      const x = canvas_cx + disk_radius * Math.sin(lon_rad) * Math.cos(lat_rad);
      const y = canvas_cy - disk_radius * Math.sin(lat_rad);
      return { x, y };
    };

    const hardcodedARs = [
      { id: 'AR4478', lat: -6, lon: -52, mag: 'Beta-Gamma-Delta', area: 640 },
      { id: 'AR4475', lat: -9, lon: -21, mag: 'Beta', area: 210 },
      { id: 'AR4473', lat: -14, lon: 35, mag: 'Alpha', area: 120 },
      { id: 'AR4476', lat: 8, lon: 3, mag: 'Beta-Gamma', area: 50 }
    ];

    const render = () => {
      const rect = container.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      // Background depending on filter
      ctx.fillStyle = filterMode === 'HEL1OS' ? '#000000' : '#010308';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) * 0.42;

      // Filter Color Configurations
      const colors = {
        AIA: {
          corona: ['rgba(255, 80, 0, 0.15)', 'rgba(255, 140, 0, 0.08)', 'rgba(255, 200, 100, 0.03)'],
          streamer: 'rgba(255, 200, 100',
          disk: ['rgb(255, 210, 100)', 'rgb(255, 140, 20)', 'rgb(220, 80, 10)', 'rgb(180, 40, 5)', 'rgb(60, 10, 0)'],
          granule: (b) => `rgba(255, ${b*160+80}, ${b*40}, 0.08)`,
          arCore: (isDelta) => isDelta ? '255, 255, 255' : '255, 220, 100',
          arGlow: '255, 100, 0',
          flare: '255, 255, 200'
        },
        SoLEXS: {
          corona: ['rgba(0, 255, 180, 0.12)', 'rgba(0, 180, 140, 0.06)', 'rgba(0, 100, 80, 0.02)'],
          streamer: 'rgba(0, 255, 180',
          disk: ['rgb(0, 80, 60)', 'rgb(0, 40, 30)', 'rgb(0, 20, 15)', 'rgb(0, 10, 8)', 'rgb(0, 5, 4)'],
          granule: (b) => `rgba(0, ${b*255}, ${b*200}, 0.05)`,
          arCore: (isDelta) => isDelta ? '150, 255, 255' : '0, 255, 180',
          arGlow: '0, 200, 150',
          flare: '100, 255, 255'
        },
        HEL1OS: {
          corona: ['rgba(0, 150, 255, 0.05)', 'rgba(0, 100, 255, 0.02)', 'transparent'],
          streamer: 'rgba(0, 150, 255',
          disk: ['rgb(5, 5, 10)', 'rgb(2, 2, 5)', 'rgb(0, 0, 2)', 'rgb(0, 0, 0)', 'rgb(0, 0, 0)'],
          granule: (b) => `rgba(50, 100, 255, 0.01)`,
          arCore: (isDelta) => isDelta ? '255, 255, 255' : '100, 200, 255',
          arGlow: '0, 150, 255',
          flare: '255, 255, 255'
        }
      }[filterMode];

      const stormMultiplier = demoActive ? 2.5 : 1;

      // Layer 4 - Corona Simulation
      ctx.save();
      const coronaRotation = frame * 0.0001;
      ctx.translate(cx, cy);
      ctx.rotate(coronaRotation);
      
      const cGrad1 = ctx.createRadialGradient(0, 0, radius * 0.9, 0, 0, radius * 1.05);
      cGrad1.addColorStop(0, colors.corona[0].replace(/0\.\d+\)/, `${0.15 * stormMultiplier})`));
      cGrad1.addColorStop(1, 'transparent');
      ctx.fillStyle = cGrad1;
      ctx.beginPath(); ctx.arc(0, 0, radius * 1.05, 0, Math.PI * 2); ctx.fill();

      const cGrad2 = ctx.createRadialGradient(0, 0, radius * 0.95, 0, 0, radius * 1.15);
      cGrad2.addColorStop(0, colors.corona[1].replace(/0\.\d+\)/, `${0.08 * stormMultiplier})`));
      cGrad2.addColorStop(1, 'transparent');
      ctx.fillStyle = cGrad2;
      ctx.beginPath(); ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2); ctx.fill();

      // Streamers
      if (filterMode !== 'HEL1OS') {
        streamers.forEach(s => {
          ctx.save();
          ctx.rotate(s.angle);
          ctx.beginPath();
          ctx.moveTo(radius * 0.9, -radius * s.width);
          ctx.lineTo(radius * s.length, 0);
          ctx.lineTo(radius * 0.9, radius * s.width);
          ctx.fillStyle = `${colors.streamer}, ${s.opacity * stormMultiplier})`;
          ctx.fill();
          ctx.restore();
        });
      }
      ctx.restore();

      // Layer 1 - Solar Disk
      const diskGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      diskGrad.addColorStop(0, colors.disk[0]);
      diskGrad.addColorStop(0.3, colors.disk[1]);
      diskGrad.addColorStop(0.6, colors.disk[2]);
      diskGrad.addColorStop(0.85, colors.disk[3]);
      diskGrad.addColorStop(1, colors.disk[4]);
      
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = diskGrad;
      ctx.fill();

      // Layer 2 - Granulation
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      if (filterMode !== 'HEL1OS') {
        granules.forEach(g => {
          if (g.age > g.lifespan) {
            g.x = (Math.random() - 0.5) * 2;
            g.y = (Math.random() - 0.5) * 2;
            g.r = Math.random() * (filterMode==='SoLEXS'? 12 : 6) + 2;
            g.brightness = Math.random() * 0.4 + 0.6;
            g.lifespan = Math.random() * 400 + 200;
            g.age = 0;
          }
          
          const dist = Math.sqrt(g.x * g.x + g.y * g.y);
          if (dist <= 1.0) {
            const gx = cx + g.x * radius;
            const gy = cy + g.y * radius;
            ctx.beginPath();
            ctx.arc(gx, gy, g.r, 0, Math.PI * 2);
            ctx.fillStyle = colors.granule(g.brightness);
            ctx.fill();
          }
          g.age++;
        });
      }
      ctx.restore();

      // Overlay SDO image only in AIA mode if available
      if (sdoImage && !imageFailed && filterMode === 'AIA') {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.5;
        const scale = (radius * 2.15) / sdoImage.width;
        const w = sdoImage.width * scale;
        const h = sdoImage.height * scale;
        ctx.drawImage(sdoImage, cx - w/2, cy - h/2, w, h);
        ctx.restore();
      }

      // Layer 3 - Active Regions
      ctx.globalCompositeOperation = 'screen';
      const arsToRender = activeRegions && activeRegions.length > 0 ? activeRegions : hardcodedARs;
      
      arsToRender.forEach((ar, idx) => {
        let lat = ar.lat || 0;
        let lon = ar.lon || 0;
        if (typeof ar.location === 'string' || typeof ar.coordinate === 'string') {
          const locStr = ar.location || ar.coordinate;
          const m = locStr.match(/([NS])(\d+)([EW])(\d+)/);
          if (m) {
            lat = (m[1] === 'N' ? 1 : -1) * parseInt(m[2], 10);
            lon = (m[3] === 'W' ? 1 : -1) * parseInt(m[4], 10);
          }
        }

        const { x, y } = hgToCanvas(lat, lon, cx, cy, radius);
        
        const mag = String(ar.mag || ar.Mag || '');
        const isDelta = mag.includes('Delta');
        
        // Intensity scaling based on area
        const intensity = Math.min(1.5, Math.max(0.5, (ar.area || 100) / 200));
        let coreRadius = filterMode === 'HEL1OS' ? 2 : 4 * intensity;
        
        // Render Coronal Loops (SoLEXS & AIA)
        if (filterMode !== 'HEL1OS' && isDelta) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x - 10, y + 5);
          ctx.quadraticCurveTo(x, y - 30, x + 15, y + 5);
          ctx.strokeStyle = `rgba(${colors.arGlow}, 0.4)`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }

        // Layer 5 - Solar Flare Simulation (Demo Mode)
        let flareAlpha = 0;
        if (demoActive && (ar.id === 'AR4478' || ar.number === '4478')) {
          coreRadius = filterMode === 'HEL1OS' ? 6 : 12;
          const flareFrame = frame % 150;
          if (flareFrame < 30) {
            flareAlpha = (flareFrame / 30);
          } else if (flareFrame < 150) {
            flareAlpha = 1 - (flareFrame - 30) / 120;
          }

          if (flareAlpha > 0) {
            // Intense Bloom
            ctx.shadowBlur = 40 * flareAlpha;
            ctx.shadowColor = `rgb(${colors.flare})`;
            
            ctx.beginPath();
            ctx.arc(x, y, (filterMode==='HEL1OS'?40:30) * flareAlpha, 0, Math.PI * 2);
            const flashGrad = ctx.createRadialGradient(x, y, 0, x, y, (filterMode==='HEL1OS'?40:30) * flareAlpha);
            flashGrad.addColorStop(0, `rgba(${colors.flare}, ${flareAlpha})`);
            flashGrad.addColorStop(0.2, `rgba(${colors.arCore(true)}, ${flareAlpha * 0.8})`);
            flashGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = flashGrad;
            ctx.fill();
            ctx.shadowBlur = 0; // Reset
            
            // X-ray diffraction spikes for HEL1OS
            if (filterMode === 'HEL1OS') {
              ctx.beginPath();
              ctx.moveTo(x - 50*flareAlpha, y); ctx.lineTo(x + 50*flareAlpha, y);
              ctx.moveTo(x, y - 50*flareAlpha); ctx.lineTo(x, y + 50*flareAlpha);
              ctx.strokeStyle = `rgba(${colors.flare}, ${flareAlpha * 0.8})`;
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }
        }

        // Region Glows
        const glowMult = filterMode === 'HEL1OS' ? 0.3 : 1;
        ctx.beginPath(); ctx.arc(x, y, 16 * intensity, 0, Math.PI * 2); ctx.fillStyle = `rgba(${colors.arGlow}, ${0.15 * glowMult})`; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, 9 * intensity, 0, Math.PI * 2); ctx.fillStyle = `rgba(${colors.arGlow}, ${0.4 * glowMult})`; ctx.fill();
        
        // Intense core
        ctx.shadowBlur = filterMode === 'HEL1OS' ? 15 : 5;
        ctx.shadowColor = `rgb(${colors.arCore(isDelta)})`;
        ctx.beginPath(); ctx.arc(x, y, coreRadius, 0, Math.PI * 2); ctx.fillStyle = `rgba(${colors.arCore(isDelta)}, 1)`; ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.globalCompositeOperation = 'source-over';
        ctx.font = '10px "Rajdhani"';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        const text = String(ar.id || ar.number || ar.Region);
        const tw = ctx.measureText(text).width;
        ctx.fillText(text, x - tw/2, y - 18);
        ctx.beginPath();
        ctx.moveTo(x - tw/2, y - 15);
        ctx.lineTo(x + tw/2, y - 15);
        ctx.strokeStyle = `rgba(${colors.arGlow}, 0.6)`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalCompositeOperation = 'screen';
      });
      
      ctx.globalCompositeOperation = 'source-over';

      // Layer 6 - Instrument Overlay & Grid
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${colors.arGlow}, 0.2)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      ctx.beginPath(); ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy - radius + 10); ctx.stroke(); // N
      ctx.beginPath(); ctx.moveTo(cx, cy + radius); ctx.lineTo(cx, cy + radius - 10); ctx.stroke(); // S
      ctx.beginPath(); ctx.moveTo(cx - radius, cy); ctx.lineTo(cx - radius + 10, cy); ctx.stroke(); // E
      ctx.beginPath(); ctx.moveTo(cx + radius, cy); ctx.lineTo(cx + radius - 10, cy); ctx.stroke(); // W

      ctx.font = '10px "Chakra Petch"';
      ctx.fillStyle = `rgba(${colors.arGlow}, 0.5)`;
      ctx.fillText('N', cx - 3, cy - radius - 5);
      ctx.fillText('S', cx - 3, cy + radius + 12);
      ctx.fillText('E', cx - radius - 12, cy + 3);
      ctx.fillText('W', cx + radius + 5, cy + 3);

      ctx.fillStyle = `rgba(${colors.arGlow}, 0.7)`;
      ctx.fillText(`${filterMode} SIMULATION`, 10, canvas.height - 35);
      ctx.fillText(new Date().toISOString().slice(11, 19) + ' UTC', 10, canvas.height - 11);

      frame++;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [demoActive, activeRegions, sdoImage, imageFailed, filterMode]);

  return (
    <Card className="flex flex-col h-full overflow-hidden border-border-emphasis bg-[#01050A]" p={0}>
      <div className="px-4 py-3 flex justify-between items-center bg-panel-gradient border-b border-border-subtle shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-accent-orange" />
          <h3 className="font-header text-[13px] tracking-[0.2em] font-bold text-text-primary uppercase">
            SOLAR DISK OBSERVATION
          </h3>
        </div>
        
        {/* Optical Filters Toggle */}
        <div className="flex bg-[#020B18] border border-border-subtle rounded px-1 py-1 gap-1">
          {['AIA', 'HEL1OS', 'SoLEXS'].map(mode => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`font-mono text-[10px] px-3 py-1 rounded transition-colors uppercase ${
                filterMode === mode 
                  ? 'bg-accent-orange/20 text-accent-orange border border-accent-orange/30' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-[#071E3D]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 w-full relative min-h-[300px]">
        <canvas ref={canvasRef} className="absolute inset-0 block z-0" />
        <SolarParticles trigger={activeAlert !== null} />
      </div>

      <div className={`px-4 py-2 border-t border-border-subtle shrink-0 font-telemetry text-[12px] tracking-wider uppercase transition-colors ${
        demoActive ? 'bg-alert-gradient text-accent-red border-t-accent-red/50' : 'bg-panel-gradient text-accent-amber'
      }`}>
        {demoActive ? (
          <span>
            ⚡ M5.2 FLARE ONSET DETECTED · AR4478 S06E52 · ADITYA-L1 PAYLOADS TRIGGERED
          </span>
        ) : (
          <span>
            AR4478 · S06E52 · BETA-GAMMA-DELTA · M-CLASS: 45% · X-CLASS: 20%
          </span>
        )}
      </div>
    </Card>
  );
}
