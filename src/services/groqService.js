import { API_BASE } from '../config';

export const getFlareInsight = async ({ flux, forecastProbs, neupert, activeRegions }) => {
  try {
    const base = API_BASE || 'http://localhost:8000';
    const response = await fetch(`${base}/api/ai/insight`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ flux, forecastProbs, neupert, activeRegions }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.insight) {
        return data.insight;
      }
    }
    
    // If we reach here, backend call failed or didn't return insight. Fall through to dynamic mock.
    console.warn("Backend insight generation failed or returned empty. Using dynamic mock insight generator.");
  } catch (error) {
    console.warn("Error calling backend insight API:", error.message, "Using dynamic mock insight generator.");
  }

  // Dynamic Mock Generator based on actual passed data (Fallback)
  const fluxLevel = flux > 1e-5 ? 'severe (M/X-class)' : flux > 1e-6 ? 'elevated (C-class)' : 'nominal (background)';
  const highestProb = Object.entries(forecastProbs || {}).reduce((a,b) => b[1].value > a[1].value ? b : a, ['None', {value:0}]);
  
  let insight = `Current X-ray flux is at ${fluxLevel} levels. `;
  
  if (neupert?.confirmed) {
    insight += `HEL1OS hard X-ray signatures confirm precursor activity, indicating a high-confidence flare event within ${neupert.lead_mins} minutes. `;
  } else {
    insight += `Forecast models indicate a ${highestProb[1].value}% probability of ${highestProb[0]}-class activity in the next 24 hours. `;
  }

  if (activeRegions) {
    insight += `Primary concern is region ${activeRegions.id} (${activeRegions.mag} configuration), exhibiting rapid magnetic shear development.`;
  } else {
    insight += `Continuous monitoring of SoLEXS telemetry is advised for sudden onset events.`;
  }
  
  return insight;
};
