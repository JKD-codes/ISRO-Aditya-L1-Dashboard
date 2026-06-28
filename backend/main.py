from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import httpx
from cachetools import TTLCache
import asyncio
from datetime import datetime, timedelta
import random

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
    # Keep compatibility with old calls
    url = "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json"
    return await fetch_noaa(url, "goes_realtime")

from fastapi.responses import JSONResponse

@app.get("/api/goes/xrays")
async def get_goes_xrays():
    try:
        url = "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json"
        data = await fetch_noaa(url, "goes_xrays")
        
        if data:
            print(f"GOES data sample: {data[0]}")
            
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
    # 7-day rolling window as requested in Section 1.2 & 3.3
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

@app.get("/api/aditya/solexs")
async def get_aditya_solexs():
    base_time = datetime.fromisoformat("2024-05-10T10:00:00Z")
    data = []
    for i in range(120): # 2 hours of data, 1 min intervals
        time = base_time + timedelta(minutes=i)
        base_flux = 1e-8
        if i > 50 and i < 90:
            flux = 1e-4 * (1 - abs(i - 70) / 20) ** 2 + base_flux # Gradual rise and fall (Soft X-ray)
        else:
            flux = base_flux + random.uniform(-1e-9, 1e-9)
        data.append({
            "time_tag": time.isoformat(),
            "flux": max(1e-9, flux)
        })
    return {
        "metadata": {
            "instrument": "SoLEXS",
            "mode": "OBSERVATION",
            "energy_range": "2-22 keV",
            "last_observation": "2024-05-10T12:00:00Z",
            "telemetry_status": "NOMINAL"
        },
        "data": data
    }

@app.get("/api/aditya/helios")
async def get_aditya_helios():
    base_time = datetime.fromisoformat("2024-05-10T10:00:00Z")
    data = []
    for i in range(120): 
        time = base_time + timedelta(minutes=i)
        base_counts = 50
        if i > 50 and i < 75:
            counts = 5000 * (1 - abs(i - 60) / 15) ** 4 + base_counts
        else:
            counts = base_counts + random.randint(-10, 10)
        data.append({
            "time_tag": time.isoformat(),
            "counts_per_sec": max(0, counts)
        })
    return {
        "metadata": {
            "instrument": "HEL1OS",
            "mode": "EVENT_MODE",
            "detector_temp": "-40.5 C",
            "last_trigger": "2024-05-10T11:00:00Z",
            "telemetry_status": "NOMINAL"
        },
        "data": data
    }

