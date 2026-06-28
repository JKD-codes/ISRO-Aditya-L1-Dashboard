import React, { useRef, useEffect } from 'react';
import gsap from '../../animations/gsap.config';

const AnimatedCounter = ({ value = 0, decimals = 0, suffix = '', className = '' }) => {
  const numberRef = useRef(null);
  const currentValue = useRef(value);

  useEffect(() => {
    const startValue = currentValue.current;
    const obj = { val: startValue };

    const tween = gsap.to(obj, {
      val: value,
      duration: 1.2,
      ease: 'power2.out',
      onUpdate: () => {
        if (numberRef.current) {
          numberRef.current.innerText = `${obj.val.toFixed(decimals)}${suffix}`;
        }
      },
      onComplete: () => {
        currentValue.current = value;
      }
    });

    return () => {
      tween.kill();
    };
  }, [value, decimals, suffix]);

  return (
    <span ref={numberRef} className={className}>
      {currentValue.current.toFixed(decimals)}{suffix}
    </span>
  );
};

export default AnimatedCounter;
