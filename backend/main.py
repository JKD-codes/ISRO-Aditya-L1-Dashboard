from fastapi import FastAPI, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
from cachetools import TTLCache
import asyncio
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

app = FastAPI()

# Allow CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache: maxsize 100 items, TTL 55 seconds
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

from fastapi.responses import JSONResponse

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
        print(f"Error fetching GOES data: {e}")
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

# NASA SDO live image proxy with CORS headers
@app.get("/api/sdo/latest")
async def get_sdo_latest():
    cache_key = "sdo_latest"
    if cache_key in cache:
        return Response(content=cache[cache_key], media_type="image/jpeg", headers={"Access-Control-Allow-Origin": "*"})
    
    url = "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0193.jpg"
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        response = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; AdityadL1Dashboard/1.0)"})
        response.raise_for_status()
        content = response.content
        cache[cache_key] = content
        return Response(content=content, media_type="image/jpeg",
          headers={"Access-Control-Allow-Origin": "*",
                   "Cache-Control": "max-age=900",
                   "X-Image-Updated": datetime.utcnow().isoformat()})

@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/solar-cycle")
async def get_solar_cycle():
    url = "https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json"
    return await fetch_noaa(url, "solar_cycle")

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
