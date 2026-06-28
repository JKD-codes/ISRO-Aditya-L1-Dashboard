import React from 'react';
import { useStore } from '../../store/useStore';
import { X, SlidersHorizontal, Monitor, Activity, Eye, Key } from 'lucide-react';
import { cn } from '../../lib/utils';

export function SettingsModal() {
  const { 
    isSettingsOpen, 
    setSettingsOpen, 
    presentationMode, 
    togglePresentationMode,
    refreshRate,
    setRefreshRate,
    themeContrast,
    setThemeContrast,
    groqApiKey,
    setGroqApiKey
  } = useStore();

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div 
        className="absolute inset-0"
        onClick={() => setSettingsOpen(false)}
      />

      <div className="relative w-full max-w-lg bg-[#020B18] border border-border-subtle shadow-2xl rounded-sm overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-white/[0.02]">
          <div className="flex items-center gap-2 text-text-primary">
            <SlidersHorizontal className="w-5 h-5 text-accent-orange" />
            <h2 className="font-display font-semibold tracking-widest text-[16px]">SYSTEM SETTINGS</h2>
          </div>
          <button 
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 text-text-secondary hover:text-white hover:bg-white/10 rounded-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6">
          
          {/* Section: Telemetry */}
          <div className="flex flex-col gap-3">
            <h3 className="font-mono text-[10px] text-text-secondary uppercase tracking-widest">Telemetry Stream</h3>
            
            <div className="flex items-center justify-between p-3 border border-border-subtle bg-black/20 rounded-sm">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-[#8FA3C0]" />
                <div>
                  <div className="text-text-primary text-[13px]">Refresh Rate</div>
                  <div className="text-text-secondary text-[11px]">Polling interval for GOES/SoLEXS data</div>
                </div>
              </div>
              <select 
                value={refreshRate}
                onChange={(e) => setRefreshRate(e.target.value === 'realtime' ? 'realtime' : Number(e.target.value))}
                className="bg-[#0A1628] border border-border-subtle text-text-primary text-[12px] px-2 py-1 outline-none rounded-sm cursor-pointer"
              >
                <option value="realtime">Real-time (WebSocket)</option>
                <option value={10000}>10 Seconds</option>
                <option value={30000}>30 Seconds</option>
                <option value={60000}>60 Seconds (Default)</option>
              </select>
            </div>
          </div>

          {/* Section: UI Options */}
          <div className="flex flex-col gap-3">
            <h3 className="font-mono text-[10px] text-text-secondary uppercase tracking-widest">Interface</h3>
            
            <div className="flex items-center justify-between p-3 border border-border-subtle bg-black/20 rounded-sm">
              <div className="flex items-center gap-3">
                <Monitor className="w-4 h-4 text-[#8FA3C0]" />
                <div>
                  <div className="text-text-primary text-[13px]">Presentation Mode</div>
                  <div className="text-text-secondary text-[11px]">Hides some complex logs for demonstrations</div>
                </div>
              </div>
              <button 
                onClick={togglePresentationMode}
                className={cn(
                  "relative w-10 h-5 rounded-full transition-colors",
                  presentationMode ? "bg-accent-orange" : "bg-[#1A2C45]"
                )}
              >
                <div 
                  className={cn(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform",
                    presentationMode ? "left-[22px]" : "left-1"
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 border border-border-subtle bg-black/20 rounded-sm">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-[#8FA3C0]" />
                <div>
                  <div className="text-text-primary text-[13px]">Theme Contrast</div>
                  <div className="text-text-secondary text-[11px]">Adjust dark mode baseline</div>
                </div>
              </div>
              <select 
                value={themeContrast}
                onChange={(e) => setThemeContrast(e.target.value)}
                className="bg-[#0A1628] border border-border-subtle text-text-primary text-[12px] px-2 py-1 outline-none rounded-sm cursor-pointer"
              >
                <option value="deep-space">Deep Space (Default)</option>
                <option value="midnight">Midnight Blue</option>
                <option value="high-contrast">High Contrast</option>
              </select>
            </div>
          </div>

          {/* API Keys */}
          <div className="flex flex-col gap-3">
            <h3 className="font-mono text-[10px] text-text-secondary uppercase tracking-widest">Authentication</h3>
            <div className="flex items-center justify-between p-3 border border-border-subtle bg-black/20 rounded-sm">
              <div className="flex items-center gap-3">
                <Key className="w-4 h-4 text-[#8FA3C0]" />
                <div className="flex flex-col">
                  <div className="text-text-primary text-[13px]">Groq API Key</div>
                  <div className="text-text-secondary text-[11px]">Required for AI flare insights</div>
                </div>
              </div>
              <input 
                type="password"
                placeholder="sk-..."
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                className="px-3 py-1 w-32 bg-[#0A1628] border border-border-subtle text-text-primary text-[11px] rounded-sm outline-none focus:border-accent-orange transition-colors"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle bg-white/[0.02] flex justify-end">
          <button 
            onClick={() => setSettingsOpen(false)}
            className="px-4 py-1.5 bg-accent-orange text-white text-[12px] font-bold tracking-widest rounded-sm hover:bg-orange-500 transition-colors"
          >
            SAVE CHANGES
          </button>
        </div>

      </div>
    </div>
  );
}
