import React, { useEffect, useRef } from 'react';
import { AlertBanner } from '../components/ui/AlertBanner';
import { SolarSimulation } from '../components/dashboard/SolarSimulation';
import { LiveFluxChart } from '../components/dashboard/LiveFluxChart';
import { DualPayloadChart } from '../components/dashboard/DualPayloadChart';
import { PredictionEngineStatus } from '../components/dashboard/PredictionEngineStatus';
import { FlareProbabilityGauge } from '../components/dashboard/FlareProbabilityGauge';
import { ActiveRegionTable } from '../components/dashboard/ActiveRegionTable';
import { PayloadStatus } from '../components/dashboard/PayloadStatus';
import { GroqInsightPanel } from '../components/dashboard/GroqInsightPanel';
import { SpaceWeatherImpactPanel } from '../components/dashboard/SpaceWeatherImpactPanel';
import { SolarWindMonitor } from '../components/dashboard/SolarWindMonitor';
import { AlgorithmConfidenceFactors } from '../components/dashboard/AlgorithmConfidenceFactors';
import { SpectralHardnessChart } from '../components/dashboard/SpectralHardnessChart';
import { useStore } from '../store/useStore';
import { useLocation } from 'react-router-dom';
import gsap from '../animations/gsap.config';

export function Dashboard() {
  const { setSimulationMode, triggerDemoMode, demoActive, presentationMode } = useStore();
  const location = useLocation();
  const dPresses = useRef([]);
  const dashboardRef = useRef(null);

  useEffect(() => {
    if (presentationMode) {
      document.documentElement.classList.add('presentation-mode');
      gsap.globalTimeline.timeScale(0.7);
    } else {
      document.documentElement.classList.remove('presentation-mode');
      gsap.globalTimeline.timeScale(1.0);
    }
  }, [presentationMode]);

  useEffect(() => {
    if (dashboardRef.current) {
      const cards = dashboardRef.current.querySelectorAll('.dashboard-card');
      gsap.fromTo(cards,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out' }
      );
    }
  }, [presentationMode]); // re-run entrance animation if layout changes

  // Demo injection: ?simulate=M5 or via 'D' key x3
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sim = params.get('simulate');
    if (sim) {
      triggerDemoMode();
    }
  }, [location, triggerDemoMode]);

  // Key listener for 'D' key three times in quick succession
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'd' || e.key === 'D') {
        const now = Date.now();
        dPresses.current.push(now);
        
        if (dPresses.current.length > 3) {
          dPresses.current.shift();
        }
        
        if (dPresses.current.length === 3) {
          const first = dPresses.current[0];
          const last = dPresses.current[2];
          if (last - first < 1000) { // 3 presses within 1 second
            triggerDemoMode();
            dPresses.current = []; // Reset
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerDemoMode]);

  return (
    <div ref={dashboardRef} className="h-auto xl:h-[calc(100vh-64px)] flex flex-col overflow-y-auto xl:overflow-hidden bg-transparent relative">
      <AlertBanner />
      
      {presentationMode && (
        <div className="absolute top-4 right-6 text-white opacity-10 font-mono text-4xl font-bold uppercase tracking-widest z-0 pointer-events-none select-none">
          PRESENTATION MODE
        </div>
      )}

      {/* Enterprise Grid Layout */}
      <div className="flex-1 flex flex-col xl:flex-row gap-2 w-full h-full p-3 overflow-hidden z-10">
        
        {/* Left Column (260px) */}
        {!presentationMode && (
          <div className="w-full xl:w-[260px] flex-shrink-0 flex flex-col gap-2 h-auto xl:h-full xl:overflow-y-auto custom-scrollbar xl:pr-1 relative z-10">
            <div className="shrink-0 dashboard-card" style={{ height: '200px' }}>
              <PayloadStatus />
            </div>
            <div className="shrink-0 dashboard-card" style={{ height: '130px' }}>
              <SolarWindMonitor />
            </div>
            <div className="shrink-0 dashboard-card" style={{ height: '240px' }}>
              <ActiveRegionTable />
            </div>
            <div className="shrink-0 dashboard-card">
              <SpectralHardnessChart />
            </div>
            <div className="flex-1 min-h-[200px] flex flex-col dashboard-card">
              <SolarSimulation />
            </div>
          </div>
        )}

        {/* Vertical Separator */}
        {!presentationMode && <div className="hidden xl:block w-px h-full bg-[rgba(255,107,0,0.12)] shrink-0" />}

        {/* Center Column (flex: 1) */}
        <div className="w-full xl:flex-1 flex flex-col gap-2 h-auto xl:h-full xl:overflow-y-auto custom-scrollbar xl:px-1 relative z-10">
          <div className="shrink-0 dashboard-card" style={{ height: '260px' }}>
            <LiveFluxChart />
          </div>
          <div className="shrink-0 dashboard-card" style={{ height: presentationMode ? '400px' : '300px' }}>
            <DualPayloadChart />
          </div>
          <div className="shrink-0 dashboard-card" style={{ height: '180px' }}>
            <PredictionEngineStatus />
          </div>
        </div>

        {/* Vertical Separator */}
        {!presentationMode && <div className="hidden xl:block w-px h-full bg-[rgba(255,107,0,0.12)] shrink-0" />}

        {/* Right Column (280px) */}
        {!presentationMode && (
          <div className="w-full xl:w-[280px] flex-shrink-0 flex flex-col gap-2 h-auto xl:h-full xl:overflow-y-auto custom-scrollbar xl:pl-1 relative z-10">
            <div className="shrink-0 dashboard-card" style={{ height: '300px' }}>
              <FlareProbabilityGauge />
            </div>
            <div className="shrink-0 dashboard-card" style={{ minHeight: '140px' }}>
              <SpaceWeatherImpactPanel />
            </div>
            <div className="shrink-0 dashboard-card" style={{ minHeight: '180px' }}>
              <AlgorithmConfidenceFactors />
            </div>
            <div className="flex-1 min-h-[150px] flex flex-col dashboard-card">
              <GroqInsightPanel />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
export default Dashboard;
