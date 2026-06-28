import { useEffect, useRef } from 'react';
import gsap from '../animations/gsap.config';

export function useGSAPEntrance(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      const ctx = gsap.context(() => {
        gsap.from(ref.current, {
          opacity: 0,
          y: 20,
          duration: 0.8,
          ease: 'power3.out',
          ...options
        });
      }, ref);
      return () => ctx.revert();
    }
  }, []); // Only run once on mount

  return ref;
}
