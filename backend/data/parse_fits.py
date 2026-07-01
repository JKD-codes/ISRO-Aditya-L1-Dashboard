import json
import sys
import logging
import zipfile
import gzip
from pathlib import Path
from datetime import datetime, timezone

try:
    import numpy as np
    from astropy.io import fits
    from astropy.time import Time
    ASTROPY_AVAILABLE = True
except ImportError:
    ASTROPY_AVAILABLE = False

if not ASTROPY_AVAILABLE:
    print("=" * 60)
    print("ERROR: astropy and/or numpy not installed.")
    print("Install with:  pip install astropy numpy")
    print("=" * 60)
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("parse_fits")

FITS_DIR = Path(__file__).parent / "fits"
EXTRACTED_DIR = FITS_DIR / "extracted"
OUTPUT_DIR = Path(__file__).parent / "processed"
OUTPUT_DIR.mkdir(exist_ok=True)
FITS_DIR.mkdir(exist_ok=True)
EXTRACTED_DIR.mkdir(exist_ok=True)

def _extract_zips():
    zip_files = list(FITS_DIR.glob("*.zip"))
    for zf in zip_files:
        try:
            logger.info(f"Extracting {zf.name}...")
            with zipfile.ZipFile(zf, 'r') as zip_ref:
                zip_ref.extractall(EXTRACTED_DIR)
        except Exception as e:
            logger.error(f"Failed to extract {zf.name}: {e}")

def parse_solexs() -> dict:
    # Find SDD2 lc.gz
    lc_files = list(EXTRACTED_DIR.rglob("*/SDD2/*_L1.lc.gz")) + list(FITS_DIR.rglob("*/SDD2/*_L1.lc.gz"))
    if not lc_files:
        raise ValueError("No SDD2 .lc.gz file found for SoLEXS")
    
    filepath = lc_files[0]
    logger.info(f"Parsing SoLEXS: {filepath.name}")
    
    with fits.open(filepath) as hdul:
        data = hdul[1].data
        times = data['TIME']
        counts = data['COUNTS']
        
        timestamps = []
        flux = []
        for t, c in zip(times, counts):
            if not np.isnan(c) and c >= 0:
                # Unix epoch directly to UTC datetime
                dt = datetime.fromtimestamp(t, tz=timezone.utc)
                timestamps.append(dt.strftime('%Y-%m-%dT%H:%M:%S.000Z'))
                flux.append(float(c))
                
        logger.info(f"  ✓ SoLEXS parsed: {len(timestamps)} data points")
        return {
            "instrument": "SoLEXS",
            "energy_range_kev": [2.0, 22.0],
            "observation_date": "2024-05-10",
            "event": "X2.2 Gannon Storm",
            "units": "counts",
            "timestamps": timestamps,
            "flux": flux,
            "source_file": filepath.name,
            "is_real_data": True
        }

def parse_helios() -> dict:
    czt1_files = list(EXTRACTED_DIR.rglob("*/czt/lightcurve_czt1.fits")) + list(FITS_DIR.rglob("*/czt/lightcurve_czt1.fits"))
    czt2_files = list(EXTRACTED_DIR.rglob("*/czt/lightcurve_czt2.fits")) + list(FITS_DIR.rglob("*/czt/lightcurve_czt2.fits"))
    cdte1_files = list(EXTRACTED_DIR.rglob("*/cdte/lightcurve_cdte1.fits")) + list(FITS_DIR.rglob("*/cdte/lightcurve_cdte1.fits"))
    cdte2_files = list(EXTRACTED_DIR.rglob("*/cdte/lightcurve_cdte2.fits")) + list(FITS_DIR.rglob("*/cdte/lightcurve_cdte2.fits"))
    
    all_files = czt1_files + czt2_files + cdte1_files + cdte2_files
    if not all_files:
        raise ValueError("No HEL1OS lightcurve FITS files found")
        
    flux_map = {}
    for f in all_files:
        logger.info(f"Parsing HEL1OS: {f.name}")
        with fits.open(f) as hdul:
            data = hdul[-1].data # Last extension has the broadband total
            isot = data['ISOT']
            ctr = data['CTR']
            for t, c in zip(isot, ctr):
                if not np.isnan(c) and c >= 0:
                    if t not in flux_map:
                        flux_map[t] = []
                    flux_map[t].append(float(c))
                    
    sorted_times = sorted(flux_map.keys())
    timestamps = []
    flux = []
    for t in sorted_times:
        # Sum counts across detectors for better signal
        total_flux = sum(flux_map[t])
        # Format isot to ensure standard ISO string
        t_clean = t.strip() if isinstance(t, str) else str(t).strip()
        if not t_clean.endswith('Z'):
            t_clean += 'Z'
        timestamps.append(t_clean)
        flux.append(total_flux)
        
    logger.info(f"  ✓ HEL1OS parsed: {len(timestamps)} data points")
    return {
        "instrument": "HEL1OS",
        "energy_range_kev": [10.0, 150.0],
        "observation_date": "2024-05-10",
        "event": "X2.2 Gannon Storm",
        "units": "counts/second",
        "timestamps": timestamps,
        "flux": flux,
        "source_file": "Multiple",
        "is_real_data": True
    }

def main():
    _extract_zips()

    if '--inspect' in sys.argv:
        # Just simple inspect mode
        for fp in list(EXTRACTED_DIR.rglob("*.fits")) + list(EXTRACTED_DIR.rglob("*.lc.gz")):
            print(f"\n{'=' * 60}\nFILE: {fp.name}\n{'=' * 60}")
            with fits.open(fp) as hdul:
                hdul.info()
        return

    try:
        solexs_data = parse_solexs()
        out = OUTPUT_DIR / "solexs_20240510.json"
        with open(out, 'w') as f:
            json.dump(solexs_data, f, indent=2)
        logger.info(f"SoLEXS written to {out}")
    except Exception as e:
        logger.error(f"SoLEXS parsing FAILED: {e}")

    try:
        helios_data = parse_helios()
        out = OUTPUT_DIR / "helios_20240510.json"
        with open(out, 'w') as f:
            json.dump(helios_data, f, indent=2)
        logger.info(f"HEL1OS written to {out}")
    except Exception as e:
        logger.error(f"HEL1OS parsing FAILED: {e}")

if __name__ == "__main__":
    main()
