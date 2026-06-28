import React, { useRef, useEffect } from 'react';
import gsap from '../../animations/gsap.config';

const GlowPulse = ({ 
  children, 
  active = false, 
  color = 'rgba(239, 68, 68, 0.6)', // Default to a red glow
  className = '' 
}) => {
  const containerRef = useRef(null);
  const tweenRef = useRef(null);

  useEffect(() => {
    if (active && containerRef.current) {
      // Start the pulse animation
      tweenRef.current = gsap.to(containerRef.current, {
        boxShadow: `0 0 25px 8px ${color}`,
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    } else {
      // Stop animation and clear shadow
      if (tweenRef.current) {
        tweenRef.current.kill();
        tweenRef.current = null;
      }
      if (containerRef.current) {
        gsap.to(containerRef.current, {
          boxShadow: '0 0 0px 0px rgba(0,0,0,0)',
          duration: 0.3
        });
      }
    }

    return () => {
      if (tweenRef.current) {
        tweenRef.current.kill();
      }
    };
  }, [active, color]);

  return (
    <div 
      ref={containerRef} 
      className={className} 
      style={{ borderRadius: 'inherit' }}
    >
      {children}
    </div>
  );
};

export default GlowPulse;
