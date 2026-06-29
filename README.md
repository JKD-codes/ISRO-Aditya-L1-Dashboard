# Aditya-L1 Solar Flare Nowcasting & Forecasting Dashboard

Real-time solar flare prediction system built for **ISRO Problem Statement 15**, combining data from India's Aditya-L1 mission payloads (SoLEXS + HEL1OS) with NOAA/GOES observations.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  React Frontend (Vite)                               │
│  ├── Live GOES X-ray chart (NOAA proxy)              │
│  ├── Dual-payload SoLEXS/HEL1OS charts              │
│  ├── ML Forecast Panel (T+15/30/60 min)              │
│  ├── Nowcast Cross-Validation Panel                  │
│  ├── Neupert Effect Analyzer                         │
│  ├── Model Evaluation (Confusion Matrix, TSS, HSS)   │
│  └── Master Flare Catalogue (SQLite-backed)          │
├──────────────────────────────────────────────────────┤
│  FastAPI Backend                                     │
│  ├── Rolling synthetic data generator                │
│  ├── XGBoost multi-horizon forecaster                │
│  ├── Dual-channel σ-threshold nowcaster              │
│  ├── Neupert Effect cross-correlation engine         │
│  ├── SQLite master catalogue                         │
│  └── WebSocket real-time push                        │
└──────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --port 8000

# Frontend (separate terminal)
npm install
npm run dev
```

The backend trains the XGBoost model on startup (~10s for 500 synthetic events), then begins the 30-second pipeline loop.

## Data & Model Disclaimer

> **⚠ Important for evaluators and reviewers**

### Training Data

The XGBoost forecaster is trained on **physics-informed synthetic data**, not real observational data. The training set consists of:

- **500 synthetic events** with realistic class distribution: Q (40%), B (25%), C (20%), M (11%), X (4%)
- Features derived from synthetic SoLEXS soft X-ray flux and HEL1OS hard X-ray count rates
- Neupert Effect timing relationships embedded with realistic jitter
- Instrument noise, calibration glitches, and sensor dropouts injected to prevent artificially clean feature vectors

### Evaluation Metrics

All reported metrics (TSS, HSS, TPR, FAR, confusion matrix) are computed on a **held-out 20% synthetic test set** — not on real-world data. These numbers reflect model performance on the same distribution it was trained on and **will not reflect real-world performance**.

For reference, operational solar flare prediction models on real GOES/Aditya-L1 data typically achieve:
- TSS: 0.4–0.6 (our synthetic TSS will appear in a similar range due to injected noise)
- POD: 0.5–0.7
- FAR: 0.3–0.5

### Path to Real Data

The pipeline is designed as a **drop-in replacement** architecture. To swap in real data:

1. **PRADAN FITS files** → Parse SoLEXS/HEL1OS time series from FITS headers
2. **Feature extraction** → The 12-dimensional feature vector (`FeatureExtractor.extract()`) works on any `{time_tag, flux}` / `{time_tag, counts_per_sec}` format
3. **Retrain** → Call `FlareForecaster.train()` with real labeled events
4. **Nowcaster** → Background σ-thresholds adapt automatically to real instrument noise levels

## ML Pipeline Components

| Component | Description |
|-----------|-------------|
| `FeatureExtractor` | 12 features: flux derivatives, mean/std windows, spectral hardness, Neupert cross-correlation |
| `FlareNowcaster` | Independent SoLEXS (2σ derivative) + HEL1OS (3σ spike) detection with ±5min cross-validation |
| `FlareForecaster` | XGBoost multi-class classifier for T+15/30/60 min horizons |
| `NeupertAnalyzer` | Cross-correlation between HEL1OS counts and d(SoLEXS)/dt |
| `MasterCatalogueBuilder` | SQLite persistent flare database with export to CSV |

## Demo Mode

Press `J` three times quickly to open the Judge Demo Panel, which injects real flares into the backend data generator via `POST /api/demo/trigger-flare`. The nowcaster detects these naturally through the pipeline — no mock data.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/goes/xrays` | GET | NOAA GOES X-ray proxy (3-hour window) |
| `/api/aditya/solexs` | GET | Rolling SoLEXS synthetic data |
| `/api/aditya/helios` | GET | Rolling HEL1OS synthetic data |
| `/api/ml/forecast` | GET | XGBoost horizon predictions |
| `/api/ml/nowcast` | GET | Current detection status |
| `/api/ml/neupert` | GET | Neupert effect analysis |
| `/api/ml/catalogue` | GET | Master flare catalogue |
| `/api/ml/metrics` | GET | Model evaluation metrics |
| `/api/ml/features` | GET | Feature importances |
| `/api/ml/feature-vector` | GET | Current feature vector |
| `/api/demo/trigger-flare` | POST | Inject a flare for demo |
| `/ws/realtime` | WS | Real-time pipeline push |

## License

Built for ISRO Smart India Hackathon / Problem Statement 15.
