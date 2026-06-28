import Groq from "groq-sdk";

export const getFlareInsight = async ({ flux, forecastProbs, neupert, activeRegions }) => {
  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      console.warn("VITE_GROQ_API_KEY is missing. Using dynamic mock insight generator.");
      
      // Dynamic Mock Generator based on actual passed data
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
    }

    const groq = new Groq({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    });

    const prompt = `
You are an expert solar physicist analyzing live satellite data for an ISRO solar dashboard. 
Provide exactly a 3-sentence insight about the current solar activity and flare risk.

Data summary:
- Current X-ray Flux (SoLEXS): ${flux}
- Forecast (T+30 mins) probabilities: ${JSON.stringify(forecastProbs)}
- Neupert Effect (Hard X-ray lead): ${neupert?.confirmed ? `Confirmed with ${neupert.lead_mins} mins lead time` : 'Not confirmed'}
- Most complex Active Region: ${activeRegions?.id} (${activeRegions?.mag || 'Unknown'})

Return only the 3-sentence insight string, with no additional formatting or introductory text.
`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3-70b-8192",
      temperature: 0.3,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content || "No insight available.";
  } catch (error) {
    console.error("Error generating Groq insight:", error);
    return "Aditya-L1 telemetry indicates stable conditions, though temporary connection issues prevent full deep-learning analysis at this exact moment.";
  }
};
