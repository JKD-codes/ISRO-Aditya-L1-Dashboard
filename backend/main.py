"""
FastAPI backend for the Aditya-L1 Solar Flare Dashboard.
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
import httpx
from cachetools import TTLCache
import asyncio
import json
import random
import logging
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

# Legacy HEAD imports
from aditya_parser import parse_solexs_fits, parse_helios_fits
from flare_detector import detect_flares
from ml_model import predict, get_model
from pipeline.detect_flares import SolarFlareDetector

try:
    get_model()
except:
    pass


from data_generator import (
    generate_solexs_data, generate_helios_data, generate_training_dataset,
    get_state, FLARE_CLASSES,
)
from ml_engine import SolarFlarePipeline, FeatureExtractor

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# ML Pipeline Initialization
# ---------------------------------------------------------------------------
pipeline = SolarFlarePipeline(
    db_path='flare_catalogue.db',
    model_dir='models'
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """On startup: train the ML model if not already trained."""
    logger.info("🚀 Starting Aditya-L1 Backend...")

    if not pipeline.forecaster.is_trained:
        logger.info("🔧 Training XGBoost model on synthetic data (500 events)...")
        training_data = generate_training_dataset(num_events=500, window_minutes=60)
        pipeline.initialize(training_data)
        logger.info("✅ Model training complete.")
    else:
        logger.info("✅ Pre-trained model loaded.")
        pipeline._initialized = True

    # Start background pipeline processing
    task = asyncio.create_task(background_pipeline_loop())

    yield

    task.cancel()
    logger.info("🛑 Backend shutdown.")


app = FastAPI(lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache: maxsize 100, TTL 55 seconds
cache = TTLCache(maxsize=100, ttl=55)

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



async def fetch_noaa(url: str, cache_key: str):
    if cache_key in cache:
        return cache[cache_key]
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()
        cache[cache_key] = data
        return data


@app.get("/api/goes/realtime")
async def get_goes_realtime():
    url = "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json"
    return await fetch_noaa(url, "goes_realtime")


@app.get("/api/goes/xrays")
async def get_goes_xrays():
    try:
        url = "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json"
        data = await fetch_noaa(url, "goes_xrays")

        now = datetime.utcnow()
        three_hours_ago = now - timedelta(hours=3)
        filtered = [d for d in data if d.get('time_tag', '') > three_hours_ago.isoformat()]
        return JSONResponse(
            content=filtered[-180:],
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        logger.error(f"Error fetching GOES data: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/goes/flares")
async def get_goes_flares():
    url = "https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json"
    return await fetch_noaa(url, "goes_flares")


@app.get("/api/solar/regions")
async def get_solar_regions_endpoint():
    url = "https://services.swpc.noaa.gov/json/solar_regions.json"
    return await fetch_noaa(url, "solar_regions")


@app.get("/api/solar-regions")
async def get_solar_regions_compat():
    url = "https://services.swpc.noaa.gov/json/solar_regions.json"
    return await fetch_noaa(url, "solar_regions")


@app.get("/api/solar/probs")
async def get_solar_probs():
    url = "https://services.swpc.noaa.gov/json/solar_probabilities.json"
    return await fetch_noaa(url, "solar_probs")


@app.get("/api/alerts")
async def get_alerts():
    url = "https://services.swpc.noaa.gov/products/alerts.json"
    return await fetch_noaa(url, "alerts")


@app.get("/api/kp-index")
async def get_kp_index():
    url = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"
    return await fetch_noaa(url, "kp_index")


@app.get("/api/solar-cycle")
async def get_solar_cycle():
    url = "https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json"
    return await fetch_noaa(url, "solar_cycle")

@app.get("/api/pipeline/nowcast")
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
# Gannon Storm Endpoints (Real FITS data or synthetic fallback)
# ---------------------------------------------------------------------------

_GANNON_STORM_PROCESSED = Path(__file__).parent / 'data' / 'processed'


def _generate_synthetic_gannon_solexs():
    """Python port of the synthetic Gannon Storm SoLEXS generator."""
    import math
    peak_time = datetime(2024, 5, 10, 6, 54, 0, tzinfo=timezone.utc)
    BACKGROUND = 1e-8
    PEAK = 2.1e-4
    timestamps = []
    flux = []
    for i in range(120):
        offset_min = i - 60
        t = peak_time + timedelta(minutes=offset_min)
        timestamps.append(t.strftime('%Y-%m-%dT%H:%M:%SZ'))
        if offset_min < -40:
            f = BACKGROUND
        elif offset_min < 0:
            rise = (offset_min + 40) / 40
            f = BACKGROUND * math.pow(PEAK / BACKGROUND, rise * rise)
        else:
            f = PEAK * math.exp(-offset_min / 28)
        noise = 1 + (random.random() - 0.5) * 0.04
        flux.append(max(1e-9, f * noise))
    return {
        "instrument": "SoLEXS",
        "observation_date": "2024-05-10",
        "event": "X2.2 Gannon Storm",
        "units": "counts/second",
        "timestamps": timestamps,
        "flux": flux,
        "is_real_data": False,
        "data_source": "synthetic_fallback"
    }


def _generate_synthetic_gannon_helios():
    """Python port of the synthetic Gannon Storm HEL1OS generator."""
    import math
    peak_time = datetime(2024, 5, 10, 6, 54, 0, tzinfo=timezone.utc)
    BACKGROUND = 47
    PEAK = 6200
    timestamps = []
    flux = []
    for i in range(120):
        offset_min = i - 60
        t = peak_time + timedelta(minutes=offset_min)
        timestamps.append(t.strftime('%Y-%m-%dT%H:%M:%SZ'))
        helios_peak = offset_min + 3  # Neupert: HEL1OS peaks 3min before SoLEXS
        if abs(helios_peak) < 8:
            c = BACKGROUND + (PEAK - BACKGROUND) * math.exp(-helios_peak * helios_peak / 8)
        else:
            c = BACKGROUND + max(0, 50 * math.exp(-abs(helios_peak) / 3))
        noise = 1 + (random.random() - 0.5) * 0.04
        flux.append(max(0, round(c * noise)))
    return {
        "instrument": "HEL1OS",
        "observation_date": "2024-05-10",
        "event": "X2.2 Gannon Storm",
        "units": "counts/second",
        "timestamps": timestamps,
        "flux": flux,
        "is_real_data": False,
        "data_source": "synthetic_fallback"
    }


@app.get("/api/gannon-storm/solexs")
async def get_gannon_storm_solexs():
    """Serve real Gannon Storm SoLEXS data if processed JSON exists, else synthetic."""
    path = _GANNON_STORM_PROCESSED / "solexs_20240510.json"
    if path.exists():
        try:
            data = json.loads(path.read_text())
            data["data_source"] = "real_pradan"
            return data
        except Exception as e:
            logger.error(f"Failed to load Gannon Storm SoLEXS: {e}")
    return _generate_synthetic_gannon_solexs()


@app.get("/api/gannon-storm/helios")
async def get_gannon_storm_helios():
    """Serve real Gannon Storm HEL1OS data if processed JSON exists, else synthetic."""
    path = _GANNON_STORM_PROCESSED / "helios_20240510.json"
    if path.exists():
        try:
            data = json.loads(path.read_text())
            data["data_source"] = "real_pradan"
            return data
        except Exception as e:
            logger.error(f"Failed to load Gannon Storm HEL1OS: {e}")
    return _generate_synthetic_gannon_helios()


# ---------------------------------------------------------------------------
# NASA SDO Image Proxy
# ---------------------------------------------------------------------------

@app.get("/api/sdo/latest")
async def get_sdo_latest():
    cache_key = "sdo_latest"
    if cache_key in cache:
        return Response(content=cache[cache_key], media_type="image/jpeg",
                        headers={"Access-Control-Allow-Origin": "*"})
    url = "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0193.jpg"
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        response = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; AdityaL1Dashboard/2.0)"})
        response.raise_for_status()
        content = response.content
        cache[cache_key] = content
        return Response(content=content, media_type="image/jpeg",
                        headers={"Access-Control-Allow-Origin": "*",
                                 "Cache-Control": "max-age=900",
                                 "X-Image-Updated": datetime.utcnow().isoformat()})


# ---------------------------------------------------------------------------
# Aditya-L1 Data Endpoints (Rolling Live Data)
# ---------------------------------------------------------------------------

@app.get("/api/aditya/solexs")
async def get_aditya_solexs():
    """Rolling SoLEXS data for the last 120 minutes relative to current UTC."""
    data, metadata = generate_solexs_data(window_minutes=120)
    return {"metadata": metadata, "data": data}


@app.get("/api/aditya/helios")
async def get_aditya_helios():
    """Rolling HEL1OS data for the last 120 minutes relative to current UTC."""
    data, metadata = generate_helios_data(window_minutes=120)
    return {"metadata": metadata, "data": data}


# ---------------------------------------------------------------------------
# ML Pipeline Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/ml/forecast")
async def get_ml_forecast():
    """Return XGBoost predictions for T+15/30/60 minutes.

    Response shape (compatible with MLForecastPanel):
    {
        horizons: [{horizon, class_probs: {B,C,M,X}, confidence}, ...],
        lead_time_mins: float,
        model_version: str
    }
    """
    if _last_pipeline_result and 'forecast' in _last_pipeline_result:
        return _last_pipeline_result['forecast']

    # Fallback: run prediction on current data
    solexs_data, _ = generate_solexs_data(window_minutes=60)
    helios_data, _ = generate_helios_data(window_minutes=60)
    features = FeatureExtractor.extract(solexs_data, helios_data)
    return pipeline.forecaster.predict(features)


@app.get("/api/ml/nowcast")
async def get_ml_nowcast():
    """Return current nowcast detection status."""
    if _last_pipeline_result and 'nowcast' in _last_pipeline_result:
        return _last_pipeline_result['nowcast']
    return {
        'solexs': None,
        'helios': None,
        'cross_validation': {
            'solexs_detected': False,
            'helios_detected': False,
            'cross_validated': False,
            'combined_confidence': 0,
        },
        'status': pipeline.nowcaster.get_status(),
    }


@app.get("/api/ml/neupert")
async def get_ml_neupert():
    """Return Neupert effect analysis."""
    if _last_pipeline_result and 'neupert' in _last_pipeline_result:
        return _last_pipeline_result['neupert']

    solexs_data, _ = generate_solexs_data(window_minutes=120)
    helios_data, _ = generate_helios_data(window_minutes=120)
    from ml_engine import NeupertAnalyzer
    return NeupertAnalyzer.analyze(solexs_data, helios_data)


@app.get("/api/ml/catalogue")
async def get_ml_catalogue():
    """Return the automated master flare catalogue."""
    catalogue = pipeline.catalogue.get_catalogue(limit=200)
    stats = pipeline.catalogue.get_stats()
    return {
        'events': catalogue,
        'stats': stats,
    }


@app.get("/api/ml/metrics")
async def get_ml_metrics():
    """Return model evaluation metrics (TPR, FAR, TSS, HSS, confusion matrix)."""
    metrics = pipeline.forecaster.get_training_metrics()
    if not metrics:
        return {
            'accuracy': 0, 'TSS': 0, 'HSS': 0, 'TPR': 0, 'FAR': 0,
            'confusion_matrix': [[0]*5]*5,
            'class_labels': ['Q', 'B', 'C', 'M', 'X'],
            'model_version': 'Not trained',
        }
    return metrics

@app.get("/api/ml/real-validation")
async def get_ml_real_validation():
    """Cross-validate pipeline detections against NOAA GOES catalogue."""
    try:
        # Get our catalogue
        catalogue = pipeline.catalogue.get_catalogue(limit=200)
        
        # Fetch latest NOAA catalogue
        url = "https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json"
        noaa_data = await fetch_noaa(url, "goes_flares_validation")
        
        from ml_engine import CatalogueValidator
        validation = CatalogueValidator.validate_against_noaa(catalogue, noaa_data)
        return validation
    except Exception as e:
        logger.error(f"Error validating against NOAA: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

# ---------------------------------------------------------------------------
# AI Insight Proxy (Groq)
# ---------------------------------------------------------------------------
from pydantic import BaseModel

class InsightRequest(BaseModel):
    flux: float
    forecastProbs: dict = {}
    neupert: dict = {}
    activeRegions: dict = {}

@app.post("/api/ai/insight")
async def get_ai_insight(req: InsightRequest):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return JSONResponse(status_code=503, content={"error": "GROQ_API_KEY not configured on server"})

    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=api_key)
        
        prompt = f"""
You are an expert solar physicist analyzing live satellite data for an ISRO solar dashboard. 
Provide exactly a 3-sentence insight about the current solar activity and flare risk.

Data summary:
- Current X-ray Flux (SoLEXS): {req.flux}
- Forecast (T+30 mins) probabilities: {json.dumps(req.forecastProbs)}
- Neupert Effect (Hard X-ray lead): {'Confirmed with ' + str(req.neupert.get('lead_mins', 0)) + ' mins lead time' if req.neupert.get('confirmed') else 'Not confirmed'}
- Most complex Active Region: {req.activeRegions.get('id') if req.activeRegions else 'Unknown'} ({req.activeRegions.get('mag') if req.activeRegions else 'Unknown'})

Return only the 3-sentence insight string, with no additional formatting or introductory text.
"""
        completion = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3-70b-8192",
            temperature=0.3,
            max_tokens=200,
        )
        return {"insight": completion.choices[0].message.content}
    except Exception as e:
        logger.error(f"Error generating Groq insight: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/ml/features")
async def get_ml_features():
    """Return XGBoost feature importances."""
    importances = pipeline.forecaster.get_feature_importances()
    return {
        'feature_importances': importances,
        'feature_names': list(importances.keys()) if importances else [],
    }


@app.get("/api/ml/feature-vector")
async def get_ml_feature_vector():
    """Return the current feature vector being fed to the model."""
    if _last_pipeline_result and 'features' in _last_pipeline_result:
        return _last_pipeline_result['features']
    return pipeline.get_last_features()


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "ml_initialized": pipeline._initialized,
        "model_trained": pipeline.forecaster.is_trained,
        "catalogue_events": pipeline.catalogue.get_stats()['total_events'],
        "ws_clients": len(ws_clients),
    }


# ---------------------------------------------------------------------------
# Demo Flare Trigger
# ---------------------------------------------------------------------------

@app.post("/api/demo/trigger-flare")
async def trigger_demo_flare(flare_class: str = Query('M', pattern='^[BCMX]$')):
    """Inject a flare directly into the rolling data generator.

    The nowcaster will detect it naturally on the next pipeline tick (~30s).
    Accepts B, C, M, or X as flare_class.
    """
    state = get_state()
    now = datetime.now(timezone.utc)
    params = FLARE_CLASSES[flare_class]
    subclass = round(random.uniform(1.5, 7.0), 1)

    flare = {
        'peak_time': now + timedelta(minutes=params['rise_min'] * 0.6),
        'class': flare_class,
        'subclass': subclass,
        'full_class': f"{flare_class}{subclass}",
        'peak_flux': params['peak_flux'] * (subclass / 5.0),
        'peak_counts': int(params['peak_counts'] * (subclass / 5.0)),
        'rise_min': params['rise_min'] * random.uniform(0.8, 1.2),
        'decay_min': params['decay_min'] * random.uniform(0.8, 1.2),
        'neupert_lead_min': random.uniform(2.0, 5.0),
    }
    state.active_flares.append(flare)
    state.flare_history.append(flare)

    logger.info(f"🔥 Demo flare injected: {flare['full_class']} peaking at ~{flare['peak_time'].strftime('%H:%M:%S')} UTC")

    return {
        'status': 'injected',
        'flare_class': flare['full_class'],
        'peak_time': flare['peak_time'].strftime('%Y-%m-%dT%H:%M:%SZ'),
        'peak_flux': flare['peak_flux'],
        'message': f"{flare['full_class']} flare injected. Nowcaster will detect on next pipeline tick (~30s)."
    }


# ---------------------------------------------------------------------------
# WebSocket Endpoint
# ---------------------------------------------------------------------------

@app.websocket("/ws/realtime")
async def websocket_realtime(ws: WebSocket):
    await ws.accept()
    ws_clients.append(ws)
    logger.info(f"WebSocket client connected. Total: {len(ws_clients)}")

    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)

            if msg.get('type') == 'ping':
                await ws.send_text(json.dumps({'type': 'pong', 'pong': True}))

    except WebSocketDisconnect:
        if ws in ws_clients:
            ws_clients.remove(ws)
        logger.info(f"WebSocket client disconnected. Total: {len(ws_clients)}")
    except Exception as e:
        if ws in ws_clients:
            ws_clients.remove(ws)
        logger.error(f"WebSocket error: {e}")
