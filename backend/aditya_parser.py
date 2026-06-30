import os
import random
from datetime import datetime, timedelta
import numpy as np

try:
    from astropy.io import fits
    from astropy.time import Time
    ASTROPY_AVAILABLE = True
except ImportError:
    ASTROPY_AVAILABLE = False

# Default data directories (assuming backend/data/ is the root for FITS files)
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
SOLEXS_DIR = os.path.join(DATA_DIR, 'solexs')
HELIOS_DIR = os.path.join(DATA_DIR, 'helios')
PROCESSED_DIR = os.path.join(DATA_DIR, 'processed')

import json

def _load_processed_json(filename: str):
    """Load a pre-processed JSON file from PROCESSED_DIR if it exists.
    Returns the parsed dict or None."""
    path = os.path.join(PROCESSED_DIR, filename)
    if os.path.exists(path):
        try:
            with open(path, 'r') as f:
                data = json.load(f)
            if data and data.get('timestamps') and len(data['timestamps']) > 0:
                print(f"[aditya_parser] Loaded real processed data: {filename}")
                return data
        except Exception as e:
            print(f"[aditya_parser] Failed to load {filename}: {e}")
    return None

def get_latest_fits_file(directory: str) -> str:
    """Finds the most recent FITS file in the given directory."""
    if not os.path.exists(directory):
        return None
    
    fits_files = [f for f in os.listdir(directory) if f.endswith('.fits') or f.endswith('.fits.gz')]
    if not fits_files:
        return None
    
    # Sort files by name assuming timestamp is in the filename (e.g., aditya_l1_solexs_20240510.fits)
    fits_files.sort(reverse=True)
    return os.path.join(directory, fits_files[0])


def generate_mock_solexs():
    """Generates realistic synthetic SoLEXS data for demo purposes."""
    base_time = datetime.utcnow() - timedelta(minutes=120)
    data = []
    for i in range(120): # 2 hours of data, 1 min intervals
        time = base_time + timedelta(minutes=i)
        base_flux = 1e-8
        if i > 50 and i < 90:
            flux = 1e-4 * (1 - abs(i - 70) / 20) ** 2 + base_flux # Gradual rise and fall (Soft X-ray)
        else:
            flux = base_flux + random.uniform(-1e-9, 1e-9)
        data.append({
            "time_tag": time.isoformat() + "Z",
            "flux": max(1e-9, flux),
            "_data_source": "synthetic_mock"
        })
    return data


def generate_mock_helios():
    """Generates realistic synthetic HEL1OS data for demo purposes."""
    base_time = datetime.utcnow() - timedelta(minutes=120)
    data = []
    for i in range(120): 
        time = base_time + timedelta(minutes=i)
        base_counts = 50
        if i > 50 and i < 75:
            # HEL1OS peak happens earlier (e.g. Neupert Effect)
            counts = 5000 * (1 - abs(i - 60) / 15) ** 4 + base_counts
        else:
            counts = base_counts + random.randint(-10, 10)
        data.append({
            "time_tag": time.isoformat() + "Z",
            "counts_per_sec": max(0, counts),
            "_data_source": "synthetic_mock"
        })
    return data


def parse_solexs_fits(file_path: str = None):
    """
    Parses SoLEXS Level-1 FITS files.
    Priority: processed JSON > FITS file > synthetic mock.
    """
    # ── Priority 1: Pre-processed real JSON (from parse_fits.py) ──
    processed = _load_processed_json('solexs_20240510.json')
    if processed:
        # Convert parallel-array format to per-point objects for compatibility
        result = []
        for i in range(len(processed.get('timestamps', []))):
            flux_val = processed['flux'][i] if i < len(processed.get('flux', [])) else None
            result.append({
                "time_tag": processed['timestamps'][i],
                "flux": flux_val if flux_val is not None else 0,
                "_data_source": "real_pradan",
                "is_real_data": True
            })
        if result:
            return result

    # ── Priority 2: FITS file ──
    if not file_path:
        file_path = get_latest_fits_file(SOLEXS_DIR)

    if file_path and os.path.exists(file_path) and ASTROPY_AVAILABLE:
        try:
            with fits.open(file_path) as hdul:
                # Assuming data is in the first extension
                data_table = hdul[1].data
                
                # Identify column names (FITS standard might vary, looking for typical names)
                cols = data_table.columns.names
                time_col = next((c for c in cols if 'TIME' in c.upper()), None)
                flux_col = next((c for c in cols if 'FLUX' in c.upper() or 'COUNTS' in c.upper()), None)
                
                if not time_col or not flux_col:
                    raise ValueError(f"Required columns not found in SoLEXS FITS: {cols}")
                
                times = data_table[time_col]
                fluxes = data_table[flux_col]
                
                parsed_data = []
                for i in range(len(times)):
                    # Handle NaN values
                    if np.isnan(fluxes[i]):
                        continue
                        
                    # Assuming time is MJD or ISOT
                    try:
                        # Attempt to parse as astropy Time
                        t = Time(times[i], format='mjd' if isinstance(times[i], float) else 'isot')
                        time_iso = t.isot + 'Z'
                    except:
                        # Fallback simple string parse
                        time_iso = str(times[i]) + 'Z'

                    parsed_data.append({
                        "time_tag": time_iso,
                        "flux": float(fluxes[i])
                    })
                
                if parsed_data:
                    return parsed_data
        except Exception as e:
            print(f"Error parsing SoLEXS FITS ({file_path}): {e}")
            print("Falling back to synthetic data.")

    # Fallback
    return generate_mock_solexs()


def parse_helios_fits(file_path: str = None):
    """
    Parses HEL1OS Level-1 FITS files.
    Priority: processed JSON > FITS file > synthetic mock.
    """
    # ── Priority 1: Pre-processed real JSON (from parse_fits.py) ──
    processed = _load_processed_json('helios_20240510.json')
    if processed:
        result = []
        for i in range(len(processed.get('timestamps', []))):
            flux_val = processed['flux'][i] if i < len(processed.get('flux', [])) else None
            result.append({
                "time_tag": processed['timestamps'][i],
                "counts_per_sec": flux_val if flux_val is not None else 0,
                "_data_source": "real_pradan",
                "is_real_data": True
            })
        if result:
            return result

    # ── Priority 2: FITS file ──
    if not file_path:
        file_path = get_latest_fits_file(HELIOS_DIR)

    if file_path and os.path.exists(file_path) and ASTROPY_AVAILABLE:
        try:
            with fits.open(file_path) as hdul:
                # Assuming data is in the first extension
                data_table = hdul[1].data
                
                cols = data_table.columns.names
                time_col = next((c for c in cols if 'TIME' in c.upper()), None)
                counts_col = next((c for c in cols if 'COUNTS' in c.upper() or 'RATE' in c.upper()), None)
                
                if not time_col or not counts_col:
                    raise ValueError(f"Required columns not found in HEL1OS FITS: {cols}")
                
                times = data_table[time_col]
                counts = data_table[counts_col]
                
                parsed_data = []
                for i in range(len(times)):
                    if np.isnan(counts[i]):
                        continue
                        
                    try:
                        t = Time(times[i], format='mjd' if isinstance(times[i], float) else 'isot')
                        time_iso = t.isot + 'Z'
                    except:
                        time_iso = str(times[i]) + 'Z'

                    parsed_data.append({
                        "time_tag": time_iso,
                        "counts_per_sec": float(counts[i])
                    })
                
                if parsed_data:
                    return parsed_data
        except Exception as e:
            print(f"Error parsing HEL1OS FITS ({file_path}): {e}")
            print("Falling back to synthetic data.")

    # Fallback
    return generate_mock_helios()
