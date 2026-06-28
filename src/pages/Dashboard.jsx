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
import { useStore } from '../store/useStore';
import { useLocation } from 'react-router-dom';

export function Dashboard() {
  const { setSimulationMode, triggerDemoMode, demoActive } = useStore();
  const location = useLocation();
  const dPresses = useRef([]);

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
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-transparent relative">
      <AlertBanner />
      
      {/* 3-Column Enterprise Grid Layout */}
      <div className="flex-1 flex gap-2 w-full h-full p-3 overflow-hidden">
        
        {/* Left Column (260px) */}
        <div className="w-[260px] flex-shrink-0 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 relative z-10">
          <div className="shrink-0" style={{ height: '200px' }}>
            <PayloadStatus />
          </div>
          <div className="shrink-0" style={{ height: '130px' }}>
            <SolarWindMonitor />
          </div>
          <div className="shrink-0" style={{ height: '240px' }}>
            <ActiveRegionTable />
          </div>
          <div className="flex-1 min-h-[200px] flex flex-col">
            <SolarSimulation />
          </div>
        </div>

        {/* Vertical Separator */}
        <div className="w-px h-full bg-[rgba(255,107,0,0.12)] shrink-0" />

        {/* Center Column (flex: 1) */}
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar px-1 relative z-10">
          <div className="shrink-0" style={{ height: '260px' }}>
            <LiveFluxChart />
          </div>
          <div className="shrink-0" style={{ height: '300px' }}>
            <DualPayloadChart />
          </div>
          <div className="shrink-0" style={{ height: '180px' }}>
            <PredictionEngineStatus />
          </div>
        </div>

        {/* Vertical Separator */}
        <div className="w-px h-full bg-[rgba(255,107,0,0.12)] shrink-0" />

        {/* Right Column (280px) */}
        <div className="w-[280px] flex-shrink-0 flex flex-col gap-2 overflow-y-auto custom-scrollbar pl-1 relative z-10">
          <div className="shrink-0" style={{ height: '300px' }}>
            <FlareProbabilityGauge />
          </div>
          <div className="shrink-0" style={{ height: '120px' }}>
            <SpaceWeatherImpactPanel />
          </div>
          <div className="shrink-0" style={{ height: '150px' }}>
            <AlgorithmConfidenceFactors />
          </div>
          <div className="flex-1 min-h-[150px] flex flex-col">
            <GroqInsightPanel />
          </div>
        </div>

      </div>
    </div>
  );
}
export default Dashboard;
