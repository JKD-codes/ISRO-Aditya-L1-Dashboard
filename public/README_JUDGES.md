# Aditya-L1 Solar Flare Forecasting Dashboard

## Quick Demo
1. Open http://localhost:5173
2. Press J three times quickly → triggers Judge Demo Mode (floating panel bottom right)
3. Alternatively, press D three times quickly → triggers hidden M5.2 flare simulation
4. Watch: HEL1OS spike appears 3 min before SoLEXS (Neupert Effect)
5. See: ML model updates T+30 forecast in real time
6. See: Groq AI generates scientific narrative

## Key Differentiators
- Neupert Effect detection: HEL1OS hard X-ray leads SoLEXS soft X-ray by 1–5 min
- This early warning is IMPOSSIBLE with GOES-only monitoring
- XGBoost classifier: TSS=0.74, POD=0.81 (above climatological skill) *(computed on synthetic held-out test set; will be revalidated on real PRADAN data)*
- Real-time WebSocket push, sub-50ms latency

## Routes
/ → Live Dashboard
/forecast → T+15/30/60 probabilistic forecast
/model → ML model explainer (for judges)
/alerts → Alert history + export
/history → Historical analysis
/payloads → Payload health

## Architecture
Frontend: React 19 + Vite + Zustand + GSAP + Recharts + Tailwind
Backend: FastAPI + XGBoost + SciPy (Neupert) + Groq LLaMA-3
