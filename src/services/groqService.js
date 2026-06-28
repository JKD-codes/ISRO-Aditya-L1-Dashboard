import Groq from "groq-sdk";

export const getFlareInsight = async ({ flux, forecastProbs, neupert, activeRegions }) => {
  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      console.warn("VITE_GROQ_API_KEY is missing. Returning mock insight.");
      return "Current data indicates nominal solar activity, though active region complexities warrant monitoring. Forecast probabilities remain stable with low X-class risk. Continuous observation of HEL1OS hard X-ray signatures will provide early warning if conditions change.";
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
- Most complex Active Region (Mag + Coordinate): ${activeRegions?.mag || 'Unknown'} at ${activeRegions?.coordinate || 'Unknown'}

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
    return "Unable to generate insights at this time due to an error.";
  }
};
