import React, { useRef, useEffect } from 'react';
import gsap from '../../animations/gsap.config';

export function SolarParticles({ trigger }) {
  const canvasRef = useRef(null);
  const particles = useRef([]);
  const ambientParticles = useRef([]);
  const animationFrameId = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Handle resize
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initAmbient();
    };
    window.addEventListener('resize', resize);
    resize();

    function initAmbient() {
      ambientParticles.current = Array.from({ length: 40 }).map(() => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2,
        alpha: Math.random() * 0.5 + 0.1
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw ambient
      ambientParticles.current.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 179, 71, ${p.alpha})`; // #FFB347
        ctx.fill();
      });

      // Draw burst particles
      particles.current.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(')', `, ${p.alpha})`).replace('rgb', 'rgba'); 
        // Note: passing hex directly to rgba is tricky, so we expect hex colors and convert
        // Actually, we can use globalAlpha
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      animationFrameId.current = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  useEffect(() => {
    if (trigger && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const colors = ['#FF6B00', '#FFB347', '#FF3B3B', '#FFE066'];
      
      const newBurst = Array.from({ length: 80 }).map(() => {
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 80 + 40; // 40-120px travel
        const p = {
          x: centerX,
          y: centerY,
          size: Math.random() * 2 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1
        };
        
        gsap.to(p, {
          x: centerX + Math.cos(angle) * velocity,
          y: centerY + Math.sin(angle) * velocity,
          alpha: 0,
          duration: 1.5 + Math.random() * 0.5,
          ease: 'power2.out',
          onComplete: () => {
            particles.current = particles.current.filter(particle => particle !== p);
          }
        });
        
        return p;
      });
      
      particles.current = [...particles.current, ...newBurst];
    }
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-50"
    />
  );
}
