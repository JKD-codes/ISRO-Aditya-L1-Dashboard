import React from 'react';
import { Card } from '../components/ui/Card';
import { Code, Database, FileText, Globe, Cpu } from 'lucide-react';

export function About() {
  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pb-6 pr-2">
      
      {/* SECTION A: ADITYA-L1 MISSION OVERVIEW CARD */}
      <Card title="ADITYA-L1 MISSION OVERVIEW" className="p-0">
        <div className="flex flex-col md:flex-row items-center gap-6 p-4">
          
          {/* Reused Mission Patch SVG at 80px */}
          <div className="w-20 h-20 shrink-0">
            <svg width="80" height="80" viewBox="0 0 120 120" className="drop-shadow-lg">
              <circle cx="60" cy="60" r="56" fill="none" stroke="#FF6B00" strokeWidth="2" />
              <circle cx="60" cy="60" r="50" fill="#020B18" stroke="#FFB347" strokeWidth="0.5" strokeDasharray="2 4" />
              <g transform="translate(60,60)">
                {[...Array(12)].map((_, i) => (
                  <line key={i} x1="0" y1="-14" x2="0" y2="-22" stroke="#FFB347" strokeWidth="1.5" transform={`rotate(${i * 30})`} />
                ))}
                <circle cx="0" cy="0" r="10" fill="#FF6B00" />
              </g>
              <path id="about-top-arc" d="M 20 60 A 40 40 0 0 1 100 60" fill="none" />
              <path id="about-bottom-arc" d="M 100 60 A 40 40 0 0 1 20 60" fill="none" />
              <text fill="#F0F4FF" fontSize="10" fontFamily="'Space Grotesk', sans-serif" fontWeight="600" letterSpacing="1px">
                <textPath href="#about-top-arc" startOffset="50%" textAnchor="middle">ADITYA-L1</textPath>
              </text>
              <text fill="#8FA3C0" fontSize="7" fontFamily="'JetBrains Mono', monospace" fontWeight="500" letterSpacing="0.5px">
                <textPath href="#about-bottom-arc" startOffset="50%" textAnchor="middle">ISRO INDIA</textPath>
              </text>
            </svg>
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col gap-2 text-center md:text-left">
            <h2 className="font-display font-semibold text-lg text-text-primary tracking-wide">
              ADITYA-L1 · India's First Solar Observatory
            </h2>
            <p className="font-mono text-[11px] text-accent-orange uppercase tracking-wider">
              Orbiting the Sun-Earth Lagrange Point L1 · 1.5 million km from Earth
            </p>
          </div>
        </div>

        {/* Separator */}
        <div className="h-[1px] bg-[rgba(255,107,0,0.12)] w-full" />

        {/* Chips and description */}
        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <div className="bg-[#020B18] border border-border-subtle px-3 py-1.5 rounded-sm font-mono text-[10px] text-text-primary">
              LAUNCH: <span className="text-accent-orange font-bold">Sep 2, 2023</span>
            </div>
            <div className="bg-[#020B18] border border-border-subtle px-3 py-1.5 rounded-sm font-mono text-[10px] text-text-primary">
              ORBIT INSERTION: <span className="text-accent-orange font-bold">Jan 6, 2024</span>
            </div>
            <div className="bg-[#020B18] border border-border-subtle px-3 py-1.5 rounded-sm font-mono text-[10px] text-text-primary">
              PAYLOADS: <span className="text-accent-orange font-bold">7 ACTIVE</span>
            </div>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed font-sans">
            Aditya-L1 is an observatory class mission from the Indian Space Research Organisation (ISRO) dedicated to studying the solar atmosphere from a halo orbit around the Sun-Earth Lagrangian point L1. By operating at L1, the spacecraft avoids eclipses, allowing continuous monitoring of solar flares, coronal mass ejections (CMEs), and coronal heating. The forecasting and nowcasting of these energetic eruptions using soft and hard X-ray spectrometers (SoLEXS & HEL1OS) are critical for safeguarding global satellite operations, GNSS navigation, and power transmission systems.
          </p>

          <div className="text-[10px] font-mono text-text-secondary bg-[#020B18] p-2 border border-border-subtle/50 rounded-sm">
            Data Attribution: Science telemetry and event data archived at ISSDC/PRADAN ·{' '}
            <a 
              href="https://pradan.issdc.gov.in/al1/" 
              target="_blank" 
              rel="noreferrer" 
              className="text-accent-orange hover:underline font-bold"
            >
              https://pradan.issdc.gov.in/al1/
            </a>
          </div>
        </div>
      </Card>

      {/* SECTION B: DATA SOURCES GRID */}
      <div className="flex flex-col gap-2">
        <h3 className="font-mono text-xs text-text-secondary uppercase tracking-wider px-1">DATA SOURCES USED IN THIS DASHBOARD</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* GOES XRS */}
          <Card title="GOES XRS (Primary)">
            <div className="absolute top-2 right-4 bg-accent-green/10 border border-accent-green/30 px-2 py-0.5 rounded text-[8px] font-mono text-accent-green font-bold uppercase tracking-wider">
              LIVE
            </div>
            <div className="flex flex-col gap-3 font-mono text-[11px] pt-1">
              <div className="flex justify-between items-start">
                <span className="text-text-secondary">Source:</span>
                <span className="text-accent-orange font-bold">NOAA GOES-18</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-text-secondary">Measurement:</span>
                <span className="text-text-primary text-right">Soft X-ray flux, 1-min cadence (0.05–0.4nm & 0.1–0.8nm)</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-text-secondary">Used For:</span>
                <span className="text-text-primary text-right">Live flux chart, probability forecasting, alert triggers, classification</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-text-secondary">Endpoint:</span>
                <a href="https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json" target="_blank" rel="noreferrer" className="text-text-secondary truncate max-w-[200px] hover:underline">/api/goes/xrays</a>
              </div>
            </div>
          </Card>

          {/* NOAA SWPC Flare List */}
          <Card title="NOAA SWPC Flare List">
            <div className="absolute top-2 right-4 bg-accent-amber/10 border border-accent-amber/30 px-2 py-0.5 rounded text-[8px] font-mono text-accent-amber font-bold uppercase tracking-wider">
              CACHED
            </div>
            <div className="flex flex-col gap-3 font-mono text-[11px] pt-1">
              <div className="flex justify-between items-start">
                <span className="text-text-secondary">Source:</span>
                <span className="text-accent-orange font-bold">SWPC</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-text-secondary">Measurement:</span>
                <span className="text-text-primary text-right">Solar flare events, 7-day rolling window database</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-text-secondary">Used For:</span>
                <span className="text-text-primary text-right">Flare event history log, Aditya-L1 observation badges</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-text-secondary">Endpoint:</span>
                <a href="https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json" target="_blank" rel="noreferrer" className="text-text-secondary truncate max-w-[200px] hover:underline">/api/goes/flares</a>
              </div>
            </div>
          </Card>

          {/* Aditya-L1 / PRADAN */}
          <Card title="Aditya-L1 / PRADAN (Showcase)">
            <div className="absolute top-2 right-4 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded text-[8px] font-mono text-[#4FC3F7] font-bold uppercase tracking-wider">
              PRE-PROCESSED
            </div>
            <div className="flex flex-col gap-3 font-mono text-[11px] pt-1">
              <div className="flex justify-between items-start">
                <span className="text-text-secondary">Source:</span>
                <span className="text-accent-orange font-bold">ISRO ISSDC</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-text-secondary">Measurement:</span>
                <span className="text-text-primary text-right">SoLEXS Level-1 FITS, HEL1OS event files — May 10, 2024</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-text-secondary">Used For:</span>
                <span className="text-text-primary text-right">Dual-payload Neupert Effect chart (embedded reconstruction)</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-text-secondary">Link:</span>
                <a href="https://pradan.issdc.gov.in/al1/" target="_blank" rel="noreferrer" className="text-text-secondary truncate max-w-[200px] hover:underline">pradan.issdc.gov.in</a>
              </div>
            </div>
          </Card>

          {/* NASA SDO AIA */}
          <Card title="NASA SDO AIA">
            <div className="absolute top-2 right-4 bg-accent-green/10 border border-accent-green/30 px-2 py-0.5 rounded text-[8px] font-mono text-accent-green font-bold uppercase tracking-wider">
              LIVE
            </div>
            <div className="flex flex-col gap-3 font-mono text-[11px] pt-1">
              <div className="flex justify-between items-start">
                <span className="text-text-secondary">Source:</span>
                <span className="text-accent-orange font-bold">NASA SDO</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-text-secondary">Measurement:</span>
                <span className="text-text-primary text-right">AIA 193Å full-disk solar ultraviolet images, 1024x1024</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-text-secondary">Used For:</span>
                <span className="text-text-primary text-right">Live solar disk monitor, active region visualization reticles</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-text-secondary">Endpoint:</span>
                <a href="https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0193.jpg" target="_blank" rel="noreferrer" className="text-text-secondary truncate max-w-[200px] hover:underline">/api/sdo/latest</a>
              </div>
            </div>
          </Card>

        </div>
      </div>

      {/* SECTION C: ALGORITHM BREAKDOWN */}
      <Card title="DETECTION ALGORITHM: NEUPERT EFFECT PIPELINE">
        <div className="flex flex-col gap-4 text-xs font-sans leading-relaxed">
          <p className="text-text-secondary">
            The automated algorithmic pipeline processes SoLEXS and HEL1OS measurements in real time to classify and detect flare onset using the <strong>Neupert Effect</strong> physics model:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#020B18]/50 border border-border-subtle/30 rounded p-4 font-mono text-[11px] text-text-primary">
            <div className="flex flex-col gap-2">
              <div><span className="text-accent-orange font-bold">STEP 1:</span> Load SoLEXS time-series (2-22 keV soft X-ray flux)</div>
              <div><span className="text-accent-orange font-bold">STEP 2:</span> Load HEL1OS time-series (10-150 keV hard X-ray counts)</div>
              <div><span className="text-accent-orange font-bold">STEP 3:</span> Resample to common 1-minute time grid (scipy interpolation)</div>
              <div><span className="text-accent-orange font-bold">STEP 4:</span> Smooth with 5-point uniform filter (scipy.ndimage)</div>
              <div><span className="text-accent-orange font-bold">STEP 5:</span> Peak detection on both channels (scipy.signal.find_peaks)</div>
            </div>
            <div className="flex flex-col gap-2">
              <div><span className="text-accent-orange font-bold">STEP 6:</span> Compute temporal offset Δt = t(HEL1OS_peak) - t(SoLEXS_peak)</div>
              <div><span className="text-accent-orange font-bold">STEP 7:</span> Neupert Effect confirmed if -30min &le; &Delta;t &le; -1min</div>
              <div><span className="text-accent-orange font-bold">STEP 8:</span> Cross-correlate dSXR/dt with HEL1OS as confidence metric</div>
              <div><span className="text-accent-orange font-bold">STEP 9:</span> Classify flare class from SoLEXS peak flux</div>
              <div><span className="text-accent-orange font-bold">STEP 10:</span> Output JSON with detection result and confidence score</div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-text-secondary border-t border-[rgba(255,107,0,0.12)] pt-2">
            Reference: Neupert (1968) ApJ 153, L59 · Dennis & Zarro (1993) Sol.Phys. 146, 177
          </div>
        </div>
      </Card>

      {/* SECTION D: TEAM & PROBLEM STATEMENT */}
      <Card title="TEAM & HACKATHON MISSION">
        <div className="flex flex-col gap-3 text-xs leading-relaxed font-sans">
          <div>
            <span className="font-mono text-accent-orange font-bold uppercase block tracking-wider mb-1 text-[11px]">Problem Statement:</span>
            <p className="text-text-primary">
              PS-15 — Forecasting and/or Nowcasting of Solar Flares using combined Soft and Hard X-ray data from Aditya-L1
            </p>
          </div>

          <div className="h-[1px] bg-[rgba(255,107,0,0.12)] w-full my-1" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <span className="font-mono text-[10px] text-text-secondary uppercase">
              Built for ISRO Solar Flare Hackathon · June 2026
            </span>
            
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 text-accent-orange hover:underline font-mono text-[11px]"
            >
              <Code className="w-4 h-4" />
              <span>GITHUB REPOSITORY</span>
            </a>
          </div>
        </div>
      </Card>

    </div>
  );
}
