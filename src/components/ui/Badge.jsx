import React from 'react';
import { cn } from '../../lib/utils';

const variantStyles = {
  B: 'bg-gray-800 text-gray-300 border-gray-600',
  C: 'bg-[rgba(79,195,247,0.15)] text-[#4FC3F7] border-[rgba(79,195,247,0.4)]',
  M: 'bg-[rgba(255,179,71,0.15)] text-accent-amber border-border-emphasis',
  X: 'bg-[rgba(255,59,59,0.15)] text-accent-red border-[rgba(255,59,59,0.4)]',
};

export function Badge({ flareClass, children, className }) {
  const baseStyle = variantStyles[flareClass] || variantStyles.B;
  
  return (
    <span className={cn(
      "inline-flex items-center justify-center px-2 py-0.5 rounded-full border-[0.5px] font-mono text-xs font-medium",
      baseStyle,
      className
    )}>
      {children || flareClass}
    </span>
  );
}
