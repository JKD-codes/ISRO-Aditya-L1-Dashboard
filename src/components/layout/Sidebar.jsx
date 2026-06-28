import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, Activity, Info, TrendingUp, BrainCircuit, Bell } from 'lucide-react';
import { cn } from '../../lib/utils';
import useMLStore from '../../store/useMLStore';

export function Sidebar({ isOpen, setIsOpen }) {
  const { mlForecast } = useMLStore();
  const t30Class = mlForecast?.horizons?.[1]?.predicted_class;
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'ML Forecast', path: '/forecast', icon: TrendingUp },
    { name: 'Model Explorer', path: '/model', icon: BrainCircuit },
    { name: 'Alert History', path: '/alerts', icon: Bell },
    { name: 'Historical Analysis', path: '/history', icon: History },
    { name: 'Payload Health', path: '/payloads', icon: Activity },
    { name: 'About Mission', path: '/about', icon: Info },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-60 bg-background-secondary border-r-[1px] border-[rgba(255,107,0,0.15)] bg-grid-texture flex flex-col transition-transform duration-300 ease-in-out shrink-0",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        
        {/* Mission Patch area */}
        <div className="h-48 flex items-center justify-center border-b-[1px] border-[rgba(255,107,0,0.15)] shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120" className="drop-shadow-lg">
            {/* Outer Ring */}
            <circle cx="60" cy="60" r="56" fill="none" stroke="#FF6B00" strokeWidth="2" />
            <circle cx="60" cy="60" r="50" fill="#020B18" stroke="#FFB347" strokeWidth="0.5" strokeDasharray="2 4" />
            
            {/* Sun Corona Icon in Center */}
            <g transform="translate(60,60)">
              {/* Rays */}
              {[...Array(12)].map((_, i) => (
                <line key={i} x1="0" y1="-14" x2="0" y2="-22" stroke="#FFB347" strokeWidth="1.5" transform={`rotate(${i * 30})`} />
              ))}
              {/* Sun Core */}
              <circle cx="0" cy="0" r="10" fill="#FF6B00" />
            </g>

            {/* Curved Text Path */}
            <path id="top-arc" d="M 20 60 A 40 40 0 0 1 100 60" fill="none" />
            <path id="bottom-arc" d="M 100 60 A 40 40 0 0 1 20 60" fill="none" />

            <text fill="#F0F4FF" fontSize="10" fontFamily="'Space Grotesk', sans-serif" fontWeight="600" letterSpacing="1px">
              <textPath href="#top-arc" startOffset="50%" textAnchor="middle">ADITYA-L1</textPath>
            </text>
            
            <text fill="#8FA3C0" fontSize="7" fontFamily="'JetBrains Mono', monospace" fontWeight="500" letterSpacing="0.5px">
              <textPath href="#bottom-arc" startOffset="50%" textAnchor="middle">SoLEXS · HEL1OS</textPath>
            </text>
          </svg>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-sm transition-colors group",
                isActive 
                  ? "bg-background-tertiary border-l-[3px] border-accent-orange text-text-primary" 
                  : "text-text-secondary hover:bg-background-tertiary/50 border-l-[3px] border-transparent hover:text-text-primary"
              )}
              onClick={() => setIsOpen(false)}
            >
              <item.icon className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:text-accent-orange transition-colors" />
              <span className="font-display text-sm tracking-wide flex-1">{item.name}</span>
              {item.name === 'ML Forecast' && t30Class && (
                <span className={cn(
                  "font-mono text-[9px] px-1.5 py-0.5 rounded-sm border font-bold",
                  t30Class.startsWith('X') ? "text-[#FF3B3B] bg-[#FF3B3B]/10 border-[#FF3B3B]/30" :
                  t30Class.startsWith('M') ? "text-[#FFB347] bg-[#FFB347]/10 border-[#FFB347]/30" :
                  t30Class.startsWith('C') ? "text-[#FDE047] bg-[#FDE047]/10 border-[#FDE047]/30" :
                  "text-[#8FA3C0] bg-[#8FA3C0]/10 border-[#8FA3C0]/30"
                )}>
                  T+30 {t30Class}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t-[1px] border-[rgba(255,107,0,0.15)] shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-text-secondary">SYSTEM ID</span>
            <span className="font-mono text-[10px] text-accent-orange">ISRO-CS-04</span>
          </div>
        </div>

      </aside>
    </>
  );
}
