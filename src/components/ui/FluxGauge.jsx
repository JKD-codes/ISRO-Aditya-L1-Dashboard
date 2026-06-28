import React, { useRef, useEffect } from 'react';
import { Card } from './Card';
import gsap from '../../animations/gsap.config';
import useMLStore from '../../store/useMLStore';

export function FluxGauge() {
  const solexsLive = useMLStore(state => state.solexsLive);
  const needleRef = useRef(null);
  const textRef = useRef(null);
  
  const currentFlux = solexsLive && solexsLive.length > 0 
    ? solexsLive[solexsLive.length - 1].flux 
    : 1e-9;
  
  const getFluxPercentage = (flux) => {
    const log = Math.log10(Math.max(1e-9, flux));
    if (log >= -4) return Math.min(100, 70 + (log + 4) * 30);
    if (log >= -5) return 40 + (log + 5) * 30;
    if (log >= -6) return 20 + (log + 6) * 20;
    return Math.max(0, (log + 9) / 3 * 20);
  };
  
  const getFlareClass = (flux) => {
    if (flux >= 1e-4) return `X${(flux / 1e-4).toFixed(1)}`;
    if (flux >= 1e-5) return `M${(flux / 1e-5).toFixed(1)}`;
    if (flux >= 1e-6) return `C${(flux / 1e-6).toFixed(1)}`;
    if (flux >= 1e-7) return `B${(flux / 1e-7).toFixed(1)}`;
    return 'A';
  };
  
  const classStr = getFlareClass(currentFlux);
  const percentage = getFluxPercentage(currentFlux);
  const prevFlux = useRef(currentFlux);

  useEffect(() => {
    const startP = getFluxPercentage(prevFlux.current);
    const endP = percentage;
    const startF = prevFlux.current;
    const endF = currentFlux;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (needleRef.current) {
        needleRef.current.setAttribute('transform', `rotate(${endP * 2.7 - 135} 80 80)`);
      }
      if (textRef.current) {
        textRef.current.textContent = endF.toExponential(2);
      }
      prevFlux.current = endF;
      return;
    }

    const obj = { p: startP, f: startF };
    
    gsap.to(obj, {
      p: endP,
      f: endF,
      duration: 1.2,
      ease: 'power2.out',
      onUpdate: () => {
        if (needleRef.current) {
          const angle = obj.p * 2.7 - 135;
          needleRef.current.setAttribute('transform', `rotate(${angle} 80 80)`);
        }
        if (textRef.current) {
          textRef.current.textContent = obj.f.toExponential(2);
        }
      },
      onComplete: () => {
        prevFlux.current = endF;
      }
    });
  }, [currentFlux, percentage]);

  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const rad = (angleDeg - 90) * Math.PI / 180.0;
    return {
      x: cx + (r * Math.cos(rad)),
      y: cy + (r * Math.sin(rad))
    };
  };

  const describeArc = (x, y, r, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y,
      "A", r, r, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };

  return (
    <Card className="flex flex-col items-center justify-center h-full relative" p={0} title="LIVE FLUX LEVEL">
      <div className="relative w-[160px] h-[160px] mt-4 mb-2">
        <svg width="160" height="160" viewBox="0 0 160 160">
          {/* Zones */}
          <path d={describeArc(80, 80, 65, -135, -81)} fill="none" stroke="#8FA3C0" strokeWidth="12" />
          <path d={describeArc(80, 80, 65, -81, -27)} fill="none" stroke="#FDE047" strokeWidth="12" />
          <path d={describeArc(80, 80, 65, -27, 54)} fill="none" stroke="#FFB347" strokeWidth="12" />
          <path d={describeArc(80, 80, 65, 54, 135)} fill="none" stroke="#FF3B3B" strokeWidth="12" />
          
          {/* Needle */}
          <g ref={needleRef} transform={`rotate(-135 80 80)`}>
            <polygon points="80,18 77,40 83,40" fill="#FFF" />
            <circle cx="80" cy="80" r="4" fill="#FFF" />
          </g>
        </svg>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-10">
          <span ref={textRef} className="font-mono text-[11px] font-bold text-white tracking-widest">
            {currentFlux.toExponential(2)}
          </span>
          <span className="font-mono text-sm font-bold text-[#FFB347] mt-0.5">
            {classStr}
          </span>
        </div>
      </div>
    </Card>
  );
}
