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
  const { setSimulationMode, triggerDemoMode, demoActive, presentationMode, forecastMode } = useStore();
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
    <div ref={dashboardRef} className="h-full flex flex-col overflow-y-auto bg-transparent relative">
      <AlertBanner />
      
      {presentationMode && (
        <div className="absolute top-4 right-6 text-white opacity-10 font-mono text-4xl font-bold uppercase tracking-widest z-0 pointer-events-none select-none">
          PRESENTATION MODE
        </div>
      )}

      {/* Responsive Dashboard Grid */}
      <div className="flex-1 w-full p-2 lg:p-3 xl:p-4 overflow-y-auto custom-scrollbar relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-2 lg:gap-2.5 xl:gap-3 auto-rows-min">
          
          {!presentationMode ? (
            <>
              {/* ─── ROW 1: Solar Sim (left) + Detector + Payload Status (right) ─── */}
              <div className="md:col-span-6 lg:col-span-5 dashboard-card" style={{ minHeight: 'clamp(320px, 40vw, 500px)' }}>
                <SolarSimulation />
              </div>

              <div className="md:col-span-3 lg:col-span-4 dashboard-card" style={{ minHeight: 'clamp(220px, 22vw, 320px)' }}>
                <FlareProbabilityGauge />
              </div>
              <div className="md:col-span-3 lg:col-span-3 dashboard-card" style={{ minHeight: 'clamp(220px, 22vw, 320px)' }}>
                <PayloadStatus />
              </div>

              {/* ─── ROW 2: Live GOES Flux (right side spans full width below solar) ─── */}
              <div className="md:col-span-6 lg:col-span-7 dashboard-card" style={{ minHeight: 'clamp(200px, 20vw, 280px)' }}>
                <LiveFluxChart showForecast={forecastMode === 'forecast'} />
              </div>

              {/* Prediction Engine Status */}
              <div className="md:col-span-6 lg:col-span-5 dashboard-card" style={{ minHeight: 'clamp(90px, 10vw, 130px)' }}>
                <PredictionEngineStatus />
              </div>

              {/* ─── ROW 3: Dual Payload + Active Regions ─── */}
              <div className="md:col-span-6 lg:col-span-7 dashboard-card" style={{ minHeight: 'clamp(220px, 22vw, 300px)' }}>
                <DualPayloadChart />
              </div>
              <div className="md:col-span-6 lg:col-span-5 dashboard-card" style={{ minHeight: 'clamp(220px, 22vw, 300px)' }}>
                <ActiveRegionTable />
              </div>

              {/* ─── ROW 4: Bottom Metric Row ─── */}
              <div className="md:col-span-3 lg:col-span-3 dashboard-card" style={{ minHeight: '130px' }}>
                <SolarWindMonitor />
              </div>
              <div className="md:col-span-3 lg:col-span-3 dashboard-card" style={{ minHeight: '130px' }}>
                <SpaceWeatherImpactPanel />
              </div>
              <div className="md:col-span-3 lg:col-span-3 dashboard-card" style={{ minHeight: '130px' }}>
                <AlgorithmConfidenceFactors />
              </div>
              <div className="md:col-span-3 lg:col-span-3 dashboard-card" style={{ minHeight: '130px' }}>
                <SpectralHardnessChart />
              </div>

              {/* ─── ROW 5: Insight + Raw Output ─── */}
              <div className="md:col-span-4 lg:col-span-8 dashboard-card" style={{ minHeight: '130px' }}>
                <GroqInsightPanel />
              </div>
              <div className="md:col-span-2 lg:col-span-4 dashboard-card" style={{ minHeight: '130px' }}>
                <PipelineOutputRaw />
              </div>
            </>
          ) : (
            <>
              {/* Presentation Mode Layout */}
              <div className="md:col-span-6 lg:col-span-12 dashboard-card min-h-[400px]">
                <LiveFluxChart showForecast={forecastMode === 'forecast'} />
              </div>
              <div className="md:col-span-6 lg:col-span-12 dashboard-card min-h-[400px]">
                <DualPayloadChart />
              </div>
              <div className="md:col-span-6 lg:col-span-12 dashboard-card min-h-[150px]">
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
