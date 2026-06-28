import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, children, withScanLine = false, title, headerRight, ...props }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden flex flex-col animate-card-entry",
        className
      )}
      style={{
        background: '#071E3D',
        border: '0.5px solid rgba(255,107,0,0.18)',
        borderRadius: '4px',
        boxShadow: 'none'
      }}
      {...props}
    >
      {withScanLine && (
        <div className="absolute left-0 right-0 h-[1px] bg-accent-orange opacity-15 z-50 animate-scan-line pointer-events-none" />
      )}
      {title && (
        <div 
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,107,0,0.12)' }}
        >
          <h3 className="font-mono text-[10px] tracking-[0.1em] text-[#8FA3C0] uppercase font-bold">
            {title}
          </h3>
          {headerRight && (
            <div className="flex items-center">
              {headerRight}
            </div>
          )}
        </div>
      )}
      <div className={cn("flex-1 flex flex-col min-h-0", props.noPadding ? "" : "px-5 py-4")}>
        {children}
      </div>
    </div>
  );
}

