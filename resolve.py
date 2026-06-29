import re

def resolve_requirements():
    with open('backend/requirements.txt', 'w') as f:
        f.write('''astropy>=6.0.0
scipy>=1.12.0
numpy>=1.26.0
fastapi>=0.110.0
uvicorn[standard]>=0.29.0
httpx>=0.27.0
cachetools
xgboost
joblib
pandas
scikit-learn
websockets
''')

def resolve_main_py():
    with open('backend/main.py', 'r') as f:
        content = f.read()
    
    # Conflict 1
    c1 = '''<<<<<<< HEAD
from fastapi import FastAPI, Response, HTTPException
=======
"""
FastAPI backend for the Aditya-L1 Solar Flare Dashboard.

Provides:
  - NOAA/SWPC proxy endpoints (GOES X-ray, flares, regions, probs, alerts, Kp)
  - Rolling Aditya-L1 synthetic data (SoLEXS + HEL1OS)
  - ML pipeline endpoints (forecast, nowcast, Neupert, catalogue, metrics, features)
  - WebSocket for real-time telemetry push
  - NASA SDO image proxy
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
>>>>>>> origin/xgboost-nowcasting-engine'''
    r1 = '''"""
FastAPI backend for the Aditya-L1 Solar Flare Dashboard.
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Response, HTTPException'''
    content = content.replace(c1, r1)

    # Conflict 2
    c2 = '''<<<<<<< HEAD
from datetime import datetime, timezone, timedelta
import random
from aditya_parser import parse_solexs_fits, parse_helios_fits
from flare_detector import detect_flares
from ml_model import predict, get_model
import json
from pathlib import Path
from pipeline.detect_flares import SolarFlareDetector

# Ensure model is trained on startup
get_model()
=======
import json
import random
import logging
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
>>>>>>> origin/xgboost-nowcasting-engine'''
    r2 = '''import json
import random
import logging
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
from pathlib import Path

# Legacy HEAD imports
from aditya_parser import parse_solexs_fits, parse_helios_fits
from flare_detector import detect_flares
from ml_model import predict, get_model
from pipeline.detect_flares import SolarFlareDetector

try:
    get_model()
except:
    pass
'''
    content = content.replace(c2, r2)
    
    # Conflict 3
    c3 = '''<<<<<<< HEAD
pipeline_cache = {"nowcast": None, "forecast": None, "last_run": None}

@app.on_event("startup")
async def run_pipeline_on_startup():
    try:
        detector = SolarFlareDetector()
        pipeline_cache["nowcast"] = detector.run_nowcast()
        detector2 = SolarFlareDetector()
        pipeline_cache["forecast"] = detector2.run_forecast()
        pipeline_cache["last_run"] = datetime.now(timezone.utc).isoformat()
        print("Pipeline executed on startup successfully.")
    except Exception as e:
        print(f"Error executing pipeline on startup: {e}")
=======
# WebSocket connections
ws_clients: list[WebSocket] = []

# Last pipeline result (shared state for API)
_last_pipeline_result = {}


# ---------------------------------------------------------------------------
# Background Pipeline Loop
# ---------------------------------------------------------------------------

async def background_pipeline_loop():
    """Run the ML pipeline every 30 seconds on the latest data."""
    global _last_pipeline_result
    while True:
        try:
            solexs_data, _ = generate_solexs_data(window_minutes=120)
            helios_data, _ = generate_helios_data(window_minutes=120)

            result = pipeline.process_tick(solexs_data, helios_data)
            _last_pipeline_result = result

            # Push to WebSocket clients
            ws_payload = json.dumps({
                'type': 'pipeline_update',
                'nowcast': result['nowcast']['cross_validation'],
                'forecast_summary': {
                    'horizons': result['forecast']['horizons'],
                    'lead_time_mins': result['forecast']['lead_time_mins'],
                },
                'neupert': {
                    'confirmed': result['neupert']['confirmed'],
                    'lead_mins': result['neupert']['lead_mins'],
                    'correlation': result['neupert']['correlation'],
                },
                'timestamp': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
            })

            disconnected = []
            for ws in ws_clients:
                try:
                    await ws.send_text(ws_payload)
                except Exception:
                    disconnected.append(ws)
            for ws in disconnected:
                ws_clients.remove(ws)

        except Exception as e:
            logger.error(f"Pipeline loop error: {e}")

        await asyncio.sleep(30)


# ---------------------------------------------------------------------------
# NOAA Proxy Endpoints
# ---------------------------------------------------------------------------
>>>>>>> origin/xgboost-nowcasting-engine'''
    r3 = '''pipeline_cache = {"nowcast": None, "forecast": None, "last_run": None}

@app.on_event("startup")
async def run_pipeline_on_startup():
    try:
        detector = SolarFlareDetector()
        pipeline_cache["nowcast"] = detector.run_nowcast()
        detector2 = SolarFlareDetector()
        pipeline_cache["forecast"] = detector2.run_forecast()
        pipeline_cache["last_run"] = datetime.now(timezone.utc).isoformat()
        print("Pipeline executed on startup successfully.")
    except Exception as e:
        print(f"Error executing pipeline on startup: {e}")

# WebSocket connections
ws_clients: list[WebSocket] = []
_last_pipeline_result = {}

async def background_pipeline_loop():
    global _last_pipeline_result
    while True:
        try:
            solexs_data, _ = generate_solexs_data(window_minutes=120)
            helios_data, _ = generate_helios_data(window_minutes=120)

            result = pipeline.process_tick(solexs_data, helios_data)
            _last_pipeline_result = result

            ws_payload = json.dumps({
                'type': 'pipeline_update',
                'nowcast': result['nowcast']['cross_validation'],
                'forecast_summary': {
                    'horizons': result['forecast']['horizons'],
                    'lead_time_mins': result['forecast']['lead_time_mins'],
                },
                'neupert': {
                    'confirmed': result['neupert']['confirmed'],
                    'lead_mins': result['neupert']['lead_mins'],
                    'correlation': result['neupert']['correlation'],
                },
                'timestamp': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
            })

            disconnected = []
            for ws in ws_clients:
                try:
                    await ws.send_text(ws_payload)
                except Exception:
                    disconnected.append(ws)
            for ws in disconnected:
                ws_clients.remove(ws)
        except Exception as e:
            logger.error(f"Pipeline loop error: {e}")
        await asyncio.sleep(30)

'''
    content = content.replace(c3, r3)
    
    # Conflict 4
    c4 = '''<<<<<<< HEAD
        
=======
>>>>>>> origin/xgboost-nowcasting-engine'''
    content = content.replace(c4, '')
    
    # Conflict 5
    c5 = '''<<<<<<< HEAD
@app.get("/api/pipeline/nowcast")
async def get_nowcast():
    if pipeline_cache["nowcast"] is None:
        raise HTTPException(503, "Pipeline not initialized")
    return pipeline_cache["nowcast"]

@app.get("/api/pipeline/forecast")
async def get_forecast():
    if pipeline_cache["forecast"] is None:
        raise HTTPException(503, "Pipeline not initialized")
    return pipeline_cache["forecast"]

@app.get("/api/pipeline/run")
async def run_pipeline_fresh():
    detector = SolarFlareDetector()
    nowcast = detector.run_nowcast()
    detector2 = SolarFlareDetector()
    forecast = detector2.run_forecast()
    pipeline_cache["nowcast"] = nowcast
    pipeline_cache["forecast"] = forecast
    pipeline_cache["last_run"] = datetime.now(timezone.utc).isoformat()
    return {"nowcast": nowcast, "forecast": forecast,
            "last_run": pipeline_cache["last_run"]}

@app.get("/api/aditya/solexs")
async def get_solexs():
    # If the parsed JSON file exists, serve it, otherwise run detector fallback
    path = Path("data/processed/solexs_20240510.json")
    if not path.exists():
        detector = SolarFlareDetector()
        detector.load_data()
        return detector.solexs_data
    return json.loads(path.read_text())

@app.get("/api/aditya/helios")
async def get_helios():
    path = Path("data/processed/helios_20240510.json")
    if not path.exists():
        detector = SolarFlareDetector()
        detector.load_data()
        return detector.helios_data
    return json.loads(path.read_text())

@app.get("/api/nowcast")
async def get_nowcast_local():
    solexs_data = parse_solexs_fits()
    helios_data = parse_helios_fits()
    flares = detect_flares(solexs_data, helios_data)
    
    return {
        "status": "active",
        "flares": flares,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.get("/api/forecast")
async def get_forecast_local():
    solexs_data = parse_solexs_fits()
    helios_data = parse_helios_fits()
    
    prediction = predict(solexs_data, helios_data)
    
    if prediction:
        return prediction
    
    return JSONResponse(status_code=500, content={"error": "Insufficient data for prediction"})
=======

# ---------------------------------------------------------------------------
# NASA SDO Image Proxy
# ---------------------------------------------------------------------------'''
    r5 = '''@app.get("/api/pipeline/nowcast")
async def get_nowcast():
    if pipeline_cache.get("nowcast") is None:
        raise HTTPException(503, "Pipeline not initialized")
    return pipeline_cache["nowcast"]

@app.get("/api/pipeline/forecast")
async def get_forecast():
    if pipeline_cache.get("forecast") is None:
        raise HTTPException(503, "Pipeline not initialized")
    return pipeline_cache["forecast"]

@app.get("/api/pipeline/run")
async def run_pipeline_fresh():
    detector = SolarFlareDetector()
    nowcast = detector.run_nowcast()
    detector2 = SolarFlareDetector()
    forecast = detector2.run_forecast()
    pipeline_cache["nowcast"] = nowcast
    pipeline_cache["forecast"] = forecast
    pipeline_cache["last_run"] = datetime.now(timezone.utc).isoformat()
    return {"nowcast": nowcast, "forecast": forecast,
            "last_run": pipeline_cache["last_run"]}

@app.get("/api/nowcast")
async def get_nowcast_local():
    solexs_data = parse_solexs_fits()
    helios_data = parse_helios_fits()
    flares = detect_flares(solexs_data, helios_data)
    return {
        "status": "active",
        "flares": flares,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.get("/api/forecast")
async def get_forecast_local():
    solexs_data = parse_solexs_fits()
    helios_data = parse_helios_fits()
    prediction = predict(solexs_data, helios_data)
    if prediction:
        return prediction
    return JSONResponse(status_code=500, content={"error": "Insufficient data for prediction"})

# ---------------------------------------------------------------------------
# NASA SDO Image Proxy
# ---------------------------------------------------------------------------'''
    content = content.replace(c5, r5)

    with open('backend/main.py', 'w') as f:
        f.write(content)

def resolve_flare_gauge():
    with open('src/components/dashboard/FlareProbabilityGauge.jsx', 'r') as fx:
        content_x = fx.read()
    
    content_x = content_x.replace(
        "const { forecastMode, setForecastMode } = useStore();",
        "const { forecastMode, setForecastMode, pipelineNowcast, solarProbs } = useStore();"
    )
    
    nowcast_vars = """
  // Nowcast values
  const pipelineConfidence = pipelineNowcast?.detection?.confidence_pct ?? 0;
  const detectedClass = pipelineNowcast?.detection?.flare_detected 
    ? pipelineNowcast.detection.flare_class 
    : 'NONE';
"""
    content_x = content_x.replace("const isHighRisk", nowcast_vars + "\n  const isHighRisk")
    
    content_x = content_x.replace(
        "const isHighRisk = t30Forecast.M > 40 || t30Forecast.X > 40;",
        "const isHighRisk = forecastMode === 'nowcast' ? ((solarProbs?.M > 40) || (solarProbs?.X > 20) || (pipelineConfidence > 50)) : (t30Forecast.M > 40 || t30Forecast.X > 40);"
    )
    content_x = content_x.replace(
        "const glowColor = t30Forecast.X > 40 ? 'rgba(255, 59, 59, 0.4)' : 'rgba(255, 179, 71, 0.4)';",
        "const glowColor = forecastMode === 'nowcast' ? ((solarProbs?.X > 20) ? 'rgba(255, 59, 59, 0.4)' : 'rgba(255, 179, 71, 0.4)') : (t30Forecast.X > 40 ? 'rgba(255, 59, 59, 0.4)' : 'rgba(255, 179, 71, 0.4)');"
    )
    
    content_x = content_x.replace(
        '<h3 className="font-display text-[13px] tracking-wider font-bold">FLARE PROBABILITY (T+30M)</h3>',
        '<h3 className="font-display text-[13px] tracking-wider font-bold">{forecastMode === "nowcast" ? "PIPELINE DETECTOR (NOWCAST)" : "FLARE PROBABILITY (T+30M)"}</h3>'
    )
    content_x = content_x.replace(
        '<span className="font-mono text-[9px] text-accent-orange/70">XGBOOST ML FORECAST</span>',
        '<span className="font-mono text-[9px] text-accent-orange/70">{forecastMode === "nowcast" ? "NEUPERT EFFECT PIPELINE" : "XGBOOST ML FORECAST"}</span>'
    )
    
    body_original = '''<div className="flex-1 flex flex-col justify-center gap-4 pb-2">
          {/* Top Row: M and X (High Impact) */}
          <div className="flex justify-around items-center px-1">
            <GaugeArc value={t30Forecast.M || 0} label="M-CLASS" color="#FFB347" size={80} />
            <GaugeArc value={t30Forecast.X || 0} label="X-CLASS" color="#FF3B3B" size={80} />
          </div>

          {/* Bottom Row: B and C (Low Impact) */}
          <div className="flex justify-around items-center px-4 opacity-70">
            <GaugeArc value={t30Forecast.B || 0} label="B-CLASS" color="#8FA3C0" size={55} />
            <GaugeArc value={t30Forecast.C || 0} label="C-CLASS" color="#00E5A0" size={55} />
          </div>
        </div>'''
        
    body_new = '''{forecastMode === 'nowcast' ? (
          <div className="flex-1 flex items-center justify-between gap-2 pb-2 px-1">
            {/* Left: Overall Confidence and Flare Class */}
            <div className="flex flex-col items-center justify-center bg-[#071324]/50 border border-purple-500/10 rounded p-3 w-[45%] h-full min-h-[120px]">
              <span className="font-mono text-[9px] text-[#8FA3C0] tracking-widest uppercase mb-1">DETECTION CONF</span>
              <GaugeArc value={pipelineConfidence} label="" color="#00E5A0" size={85} />
              <div className="mt-2 text-center">
                <span className="font-mono text-[9px] text-text-secondary block">DETECTED CLASS</span>
                <span className={cn(
                  "font-display text-xs font-bold tracking-wider",
                  detectedClass !== 'NONE' ? "text-[#FF3B3B]" : "text-[#8FA3C0]/60"
                )}>
                  {detectedClass}
                </span>
              </div>
            </div>

            {/* Right: NOAA Probs */}
            <div className="flex flex-col justify-around gap-2 w-[50%] h-full">
              <div className="flex items-center justify-between bg-[#071324]/30 px-3 py-1.5 rounded border border-border-subtle/20">
                <span className="font-mono text-[9px] text-text-secondary">C-CLASS PROB</span>
                <span className="font-mono text-xs font-bold text-[#00E5A0]">{solarProbs?.C ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between bg-[#071324]/30 px-3 py-1.5 rounded border border-border-subtle/20">
                <span className="font-mono text-[9px] text-text-secondary">M-CLASS PROB</span>
                <span className="font-mono text-xs font-bold text-[#FFB347]">{solarProbs?.M ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between bg-[#071324]/30 px-3 py-1.5 rounded border border-border-subtle/20">
                <span className="font-mono text-[9px] text-text-secondary">X-CLASS PROB</span>
                <span className="font-mono text-xs font-bold text-[#FF3B3B]">{solarProbs?.X ?? 0}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center gap-4 pb-2">
            {/* Top Row: M and X (High Impact) */}
            <div className="flex justify-around items-center px-1">
              <GaugeArc value={t30Forecast.M || 0} label="M-CLASS" color="#FFB347" size={80} />
              <GaugeArc value={t30Forecast.X || 0} label="X-CLASS" color="#FF3B3B" size={80} />
            </div>

            {/* Bottom Row: B and C (Low Impact) */}
            <div className="flex justify-around items-center px-4 opacity-70">
              <GaugeArc value={t30Forecast.B || 0} label="B-CLASS" color="#8FA3C0" size={55} />
              <GaugeArc value={t30Forecast.C || 0} label="C-CLASS" color="#00E5A0" size={55} />
            </div>
          </div>
        )}'''
    content_x = content_x.replace(body_original, body_new)
    
    content_x = content_x.replace(
        '<span className="font-mono text-[9px] text-text-secondary">ALG: XGBOOST REALTIME</span>',
        '<span className="font-mono text-[9px] text-text-secondary">{forecastMode === "nowcast" ? "ALGORITHM: NEUPERT EFFECT V1.0" : "ALG: XGBOOST REALTIME"}</span>'
    )
    
    with open('src/components/dashboard/FlareProbabilityGauge.jsx', 'w') as f:
        f.write(content_x)

resolve_requirements()
resolve_main_py()
resolve_flare_gauge()
