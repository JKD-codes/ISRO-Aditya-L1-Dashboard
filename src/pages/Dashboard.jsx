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
import { PipelineOutputRaw } from '../components/dashboard/PipelineOutputRaw';
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

      {/* Dynamic Asymmetric Grid Layout */}
      <div className="flex-1 w-full p-2 xl:p-4 overflow-y-auto custom-scrollbar relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-2 xl:gap-3 auto-rows-min">
          
          {!presentationMode ? (
            <>
              {/* Row 1-4: Solar Simulation (Huge Left Focus) */}
              <div className="md:col-span-6 xl:col-span-7 xl:row-span-4 dashboard-card flex flex-col min-h-[380px] xl:min-h-[500px]">
                <SolarSimulation />
              </div>

              {/* Row 1: Top Right Metrics */}
              <div className="md:col-span-2 xl:col-span-2 xl:row-span-1 dashboard-card min-h-[110px] xl:min-h-[130px]">
                <FlareProbabilityGauge />
              </div>
              <div className="md:col-span-4 xl:col-span-3 xl:row-span-1 dashboard-card min-h-[110px] xl:min-h-[130px]">
                <PayloadStatus />
              </div>

              {/* Row 2-3: Live Flux Chart (Right Middle) */}
              <div className="md:col-span-6 xl:col-span-5 xl:row-span-2 dashboard-card min-h-[240px] xl:min-h-[280px]">
                <LiveFluxChart />
              </div>

              {/* Row 4: Prediction Engine (Right Bottom) */}
              <div className="md:col-span-6 xl:col-span-5 xl:row-span-1 dashboard-card min-h-[100px] xl:min-h-[110px]">
                <PredictionEngineStatus />
              </div>

              {/* Row 5-6: Dual Payload (Left Bottom) & Active Regions (Right Bottom) */}
              <div className="md:col-span-6 xl:col-span-7 xl:row-span-2 dashboard-card min-h-[280px] xl:min-h-[320px]">
                <DualPayloadChart />
              </div>
              <div className="md:col-span-6 xl:col-span-5 xl:row-span-2 dashboard-card min-h-[280px] xl:min-h-[320px]">
                <ActiveRegionTable />
              </div>

              {/* Row 7: Bottom Metric Row */}
              <div className="md:col-span-2 xl:col-span-3 xl:row-span-1 dashboard-card min-h-[140px]">
                <SolarWindMonitor />
              </div>
              <div className="md:col-span-2 xl:col-span-3 xl:row-span-1 dashboard-card min-h-[140px]">
                <SpaceWeatherImpactPanel />
              </div>
              <div className="md:col-span-2 xl:col-span-3 xl:row-span-1 dashboard-card min-h-[140px]">
                <AlgorithmConfidenceFactors />
              </div>
              <div className="md:col-span-6 xl:col-span-3 xl:row-span-1 dashboard-card min-h-[140px]">
                <SpectralHardnessChart />
              </div>

              {/* Row 8: Split Width Insight & Raw Output */}
              <div className="md:col-span-4 xl:col-span-8 xl:row-span-1 dashboard-card min-h-[140px]">
                <GroqInsightPanel />
              </div>
              <div className="md:col-span-2 xl:col-span-4 xl:row-span-1 dashboard-card min-h-[140px]">
                <PipelineOutputRaw />
              </div>
            </>
          ) : (
            <>
              {/* Presentation Mode Layout */}
              <div className="md:col-span-6 xl:col-span-12 xl:row-span-2 dashboard-card min-h-[400px]">
                <LiveFluxChart />
              </div>
              <div className="md:col-span-6 xl:col-span-12 xl:row-span-2 dashboard-card min-h-[400px]">
                <DualPayloadChart />
              </div>
              <div className="md:col-span-6 xl:col-span-12 xl:row-span-1 dashboard-card min-h-[150px]">
                <PredictionEngineStatus />
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
export default Dashboard;
