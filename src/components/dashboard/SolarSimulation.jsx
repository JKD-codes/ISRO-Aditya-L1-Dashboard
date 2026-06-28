import React, { useEffect, useRef, useState } from 'react';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';

export function SolarSimulation() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { demoActive, activeRegions } = useStore();
  const [sdoImage, setSdoImage] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);

  // Helioviewer API fetch
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
    
    // Timeout for fetch
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

    const ctx = canvas.getContext('2d');
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
    const streamers = Array.from({ length: 8 }, (_, i) => ({
      angle: (i / 8) * Math.PI * 2 + Math.random() * 0.5,
      length: 1.3 + Math.random() * 0.3,
      width: 0.1 + Math.random() * 0.1,
      opacity: 0.04 + Math.random() * 0.04
    }));

    const hgToCanvas = (lat_deg, lon_deg, canvas_cx, canvas_cy, disk_radius) => {
      const lat_rad = lat_deg * Math.PI / 180;
      const lon_rad = lon_deg * Math.PI / 180;
      const x = canvas_cx + disk_radius * Math.sin(lon_rad) * Math.cos(lat_rad);
      const y = canvas_cy - disk_radius * Math.sin(lat_rad);
      return { x, y };
    };

    const hardcodedARs = [
      { id: 'AR4478', lat: -6, lon: -52, mag: 'Beta-Gamma-Delta' },
      { id: 'AR4475', lat: -9, lon: -21, mag: 'Beta' },
      { id: 'AR4473', lat: -14, lon: 35, mag: 'Alpha' },
      { id: 'AR4476', lat: 8, lon: 3, mag: 'Beta-Gamma' }
    ];

    const render = () => {
      // Resize canvas to match container
      const rect = container.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) * 0.42;

      // Layer 4 - Corona Simulation
      ctx.save();
      const coronaRotation = frame * 0.0001;
      ctx.translate(cx, cy);
      ctx.rotate(coronaRotation);
      
      const cGrad1 = ctx.createRadialGradient(0, 0, radius * 0.9, 0, 0, radius * 1.05);
      cGrad1.addColorStop(0, `rgba(255, 80, 0, ${demoActive ? 0.36 : 0.12})`);
      cGrad1.addColorStop(1, 'transparent');
      ctx.fillStyle = cGrad1;
      ctx.beginPath(); ctx.arc(0, 0, radius * 1.05, 0, Math.PI * 2); ctx.fill();

      const cGrad2 = ctx.createRadialGradient(0, 0, radius * 0.95, 0, 0, radius * 1.12);
      cGrad2.addColorStop(0, `rgba(255, 140, 0, ${demoActive ? 0.21 : 0.07})`);
      cGrad2.addColorStop(1, 'transparent');
      ctx.fillStyle = cGrad2;
      ctx.beginPath(); ctx.arc(0, 0, radius * 1.12, 0, Math.PI * 2); ctx.fill();

      const cGrad3 = ctx.createRadialGradient(0, 0, radius * 1.0, 0, 0, radius * 1.25);
      cGrad3.addColorStop(0, `rgba(255, 200, 100, ${demoActive ? 0.12 : 0.04})`);
      cGrad3.addColorStop(1, 'transparent');
      ctx.fillStyle = cGrad3;
      ctx.beginPath(); ctx.arc(0, 0, radius * 1.25, 0, Math.PI * 2); ctx.fill();

      // Streamers
      streamers.forEach(s => {
        ctx.save();
        ctx.rotate(s.angle);
        ctx.beginPath();
        ctx.moveTo(radius * 0.9, -radius * s.width);
        ctx.lineTo(radius * s.length, 0);
        ctx.lineTo(radius * 0.9, radius * s.width);
        ctx.fillStyle = `rgba(255, 200, 100, ${s.opacity * (demoActive ? 3 : 1)})`;
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();

      // Layer 1 - Solar Disk
      const diskGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      diskGrad.addColorStop(0, 'rgb(255, 200, 80)');
      diskGrad.addColorStop(0.25, 'rgb(255, 140, 20)');
      diskGrad.addColorStop(0.55, 'rgb(220, 80, 10)');
      diskGrad.addColorStop(0.75, 'rgb(180, 40, 5)');
      diskGrad.addColorStop(1, 'rgb(60, 10, 0)');
      
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = diskGrad;
      ctx.fill();

      // Layer 2 - Granulation
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip(); // Clip granules to disk

      granules.forEach(g => {
        if (g.age > g.lifespan) {
          g.x = (Math.random() - 0.5) * 2;
          g.y = (Math.random() - 0.5) * 2;
          g.r = Math.random() * 6 + 2;
          g.brightness = Math.random() * 0.4 + 0.6;
          g.lifespan = Math.random() * 400 + 200;
          g.age = 0;
        }
        
        // Only draw if within disk
        const dist = Math.sqrt(g.x * g.x + g.y * g.y);
        if (dist <= 1.0) {
          const gx = cx + g.x * radius;
          const gy = cy + g.y * radius;
          ctx.beginPath();
          ctx.arc(gx, gy, g.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, ${g.brightness*160+80}, ${g.brightness*40}, 0.08)`;
          ctx.fill();
        }
        g.age++;
      });
      ctx.restore();

      // Optional SDO Overlay
      if (sdoImage && !imageFailed) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.85;
        // Image usually spans beyond solar radius, try to fit
        const scale = (radius * 2.2) / sdoImage.width;
        const w = sdoImage.width * scale;
        const h = sdoImage.height * scale;
        ctx.drawImage(sdoImage, cx - w/2, cy - h/2, w, h);
        ctx.restore();
      }

      // Layer 3 - Active Regions
      const arsToRender = activeRegions && activeRegions.length > 0 ? activeRegions : hardcodedARs;
      
      arsToRender.forEach((ar, idx) => {
        // Fallback parsing if lat/lon not explicitly numerical
        let lat = ar.lat || 0;
        let lon = ar.lon || 0;
        if (typeof ar.Location === 'string') {
          const m = ar.Location.match(/([NS])(\d+)([EW])(\d+)/);
          if (m) {
            lat = (m[1] === 'N' ? 1 : -1) * parseInt(m[2], 10);
            lon = (m[3] === 'W' ? 1 : -1) * parseInt(m[4], 10);
          }
        }

        const { x, y } = hgToCanvas(lat, lon, cx, cy, radius);
        
        const mag = String(ar.mag || ar.Mag || '');
        const isDelta = mag.includes('Delta');
        const isAlpha = mag.includes('Alpha') && !mag.includes('Beta');
        
        const coreColor = isDelta ? '255, 59, 59' : isAlpha ? '143, 163, 192' : '255, 200, 50';
        let coreRadius = 4;
        
        // Layer 5 - Solar Flare Simulation (Demo Mode)
        let flareAlpha = 0;
        let drawArc = false;
        if (demoActive && ar.id === 'AR4478') {
          coreRadius = 8;
          const flareFrame = frame % 150;
          if (flareFrame < 30) {
            flareAlpha = (flareFrame / 30) * 0.8;
          } else if (flareFrame < 90) {
            drawArc = true;
          } else if (flareFrame < 150) {
            drawArc = true;
            ctx.globalAlpha = 1 - (flareFrame - 90) / 60;
          }

          if (flareAlpha > 0) {
            ctx.beginPath();
            ctx.arc(x, y, 20 + flareAlpha * 30, 0, Math.PI * 2);
            const flashGrad = ctx.createRadialGradient(x, y, 0, x, y, 20 + flareAlpha * 30);
            flashGrad.addColorStop(0, `rgba(255, 255, 200, ${flareAlpha})`);
            flashGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = flashGrad;
            ctx.fill();
            
            // Expand ring
            if (flareFrame < 20) {
              const ringR = (flareFrame / 20) * (radius * 0.4);
              ctx.beginPath();
              ctx.arc(x, y, ringR, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(255, 255, 200, ${0.3 * (1 - flareFrame/20)})`;
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }

          if (drawArc) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            const destX = x + 100;
            const destY = y - 100;
            const cpX = x + 20;
            const cpY = y - 120;
            ctx.quadraticCurveTo(cpX, cpY, destX, destY);
            ctx.strokeStyle = '#FF6B00';
            ctx.lineWidth = 3 * (1 - Math.max(0, (flareFrame - 30) / 120));
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }

        // a) Glowing circle
        ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 100, 0, 0.15)'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 120, 0, 0.4)'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, coreRadius, 0, Math.PI * 2); ctx.fillStyle = `rgba(${coreColor}, 0.9)`; ctx.fill();

        // b) Pulsing ring
        const pulse_radius = 9 + Math.sin(frame * 0.05 + idx * 1.2) * 4;
        ctx.beginPath(); ctx.arc(x, y, pulse_radius, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255, 107, 0, 0.6)'; ctx.lineWidth = 1; ctx.stroke();

        // c) Label
        ctx.font = '10px "JetBrains Mono"';
        ctx.fillStyle = 'white';
        const text = ar.id || ar.Region;
        const tw = ctx.measureText(text).width;
        ctx.fillText(text, x - tw/2, y - 18);
        ctx.beginPath();
        ctx.moveTo(x - tw/2, y - 15);
        ctx.lineTo(x + tw/2, y - 15);
        ctx.strokeStyle = '#FF6B00';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Layer 6 - Instrument Overlay
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 107, 0, 0.2)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      ctx.beginPath(); ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, 0); ctx.stroke(); // N
      ctx.beginPath(); ctx.moveTo(cx, cy + radius); ctx.lineTo(cx, canvas.height); ctx.stroke(); // S
      ctx.beginPath(); ctx.moveTo(cx - radius, cy); ctx.lineTo(0, cy); ctx.stroke(); // E
      ctx.beginPath(); ctx.moveTo(cx + radius, cy); ctx.lineTo(canvas.width, cy); ctx.stroke(); // W

      ctx.font = '9px "JetBrains Mono"';
      ctx.fillStyle = 'rgba(255, 107, 0, 0.5)';
      ctx.fillText('N', cx - 3, 10);
      ctx.fillText('S', cx - 3, canvas.height - 5);
      ctx.fillText('E', 5, cy + 3);
      ctx.fillText('W', canvas.width - 10, cy + 3);

      ctx.fillStyle = 'rgba(255, 200, 100, 0.7)';
      ctx.fillText('AIA 193Å SIMULATION', 10, canvas.height - 35);
      ctx.fillText('AR4478 DELTA · ELEVATED ACTIVITY', 10, canvas.height - 23);
      ctx.fillText(new Date().toISOString().slice(11, 19) + ' UTC', 10, canvas.height - 11);
      
      const tl = 'ADITYA-L1 SoLEXS MONITORING';
      const tlw = ctx.measureText(tl).width;
      ctx.fillText(tl, canvas.width - tlw - 10, canvas.height - 11);

      frame++;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [demoActive, activeRegions, sdoImage, imageFailed]);

  return (
    <Card className="flex flex-col h-full overflow-hidden" p={0}>
      <div className="px-4 py-2 flex justify-between items-center bg-[#020B18] border-b-[0.5px] border-border-subtle shrink-0 relative z-10">
        <h3 className="font-mono text-[10px] tracking-widest text-text-primary uppercase flex items-center gap-2">
          SOLAR DISK MONITOR · AIA 193Å
        </h3>
        <span className="font-mono text-[9px] bg-[#FFB347]/15 text-[#FFB347] px-2 py-0.5 rounded-sm uppercase">
          SIMULATION
        </span>
      </div>

      <div ref={containerRef} className="flex-1 w-full bg-[#01050A] relative min-h-[200px]">
        <canvas ref={canvasRef} className="absolute inset-0 block" />
      </div>

      <div className="px-4 py-1.5 bg-[#020B18] border-t-[0.5px] border-border-subtle shrink-0">
        {demoActive ? (
          <span className="font-mono text-[10px] text-[#FF3B3B] uppercase">
            ⚡ M5.2 FLARE ONSET · AR4478 S06E52 · ADITYA-L1 HEL1OS TRIGGERED
          </span>
        ) : (
          <span className="font-mono text-[10px] text-[#FFB347] uppercase">
            AR4478 · S06E52 · Beta-Gamma-Delta · M-class 45% · X-class 20% · ⚡ WATCH
          </span>
        )}
      </div>
    </Card>
  );
}
