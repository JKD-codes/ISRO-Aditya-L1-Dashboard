"""
parse_fits.py — Robust FITS parser for Aditya-L1 SoLEXS and HEL1OS Level-1 files.

Produces processed JSON files from PRADAN FITS downloads.
Handles column-name variations, 2D rate arrays, NaN/negative values,
and provides an --inspect mode for quick HDU introspection.

Usage:
    python parse_fits.py              # Parse all FITS files in fits/
    python parse_fits.py --inspect    # Just print hdul.info() for each file
"""

import json
import sys
import logging
import zipfile
from pathlib import Path

# ─── Astropy Import Guard ─────────────────────────────────────────────────────
# Matches the try/except ASTROPY_AVAILABLE pattern used in aditya_parser.py.
# If astropy is not installed, the script exits gracefully with a clear message.
try:
    import numpy as np
    from astropy.io import fits
    from astropy.time import Time
    ASTROPY_AVAILABLE = True
except ImportError as _imp_err:
    ASTROPY_AVAILABLE = False

if not ASTROPY_AVAILABLE:
    print("=" * 60)
    print("ERROR: astropy and/or numpy not installed.")
    print("Install with:  pip install astropy numpy")
    print("=" * 60)
    sys.exit(1)

# ─── Logging Setup ────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("parse_fits")

# ─── Paths ────────────────────────────────────────────────────────────────────
FITS_DIR = Path(__file__).parent / "fits"
EXTRACTED_DIR = FITS_DIR / "extracted"
OUTPUT_DIR = Path(__file__).parent / "processed"
OUTPUT_DIR.mkdir(exist_ok=True)
FITS_DIR.mkdir(exist_ok=True)
EXTRACTED_DIR.mkdir(exist_ok=True)

def _extract_zips():
    """Extract all .zip files in the fits directory to extracted/."""
    zip_files = list(FITS_DIR.glob("*.zip"))
    for zf in zip_files:
        try:
            logger.info(f"Extracting {zf.name}...")
            with zipfile.ZipFile(zf, 'r') as zip_ref:
                zip_ref.extractall(EXTRACTED_DIR)
        except Exception as e:
            logger.error(f"Failed to extract {zf.name}: {e}")

# ─── Column Name Candidates ──────────────────────────────────────────────────
# Ordered by likelihood for each instrument.
SOLEXS_RATE_COLUMNS = ['RATE', 'COUNTS', 'FLUX', 'SXR_RATE', 'COUNT_RATE', 'INTENSITY', 'NET_RATE']
HELIOS_RATE_COLUMNS = ['RATE', 'COUNTS', 'HXR_RATE', 'COUNT_RATE', 'INTENSITY', 'NET_RATE']


def _find_rate_column(col_names: list, candidates: list, instrument: str):
    """Try each candidate column name; return the first match or raise with details."""
    for col in candidates:
        if col in col_names:
            logger.info(f"  ✓ {instrument} rate column found: '{col}'")
            return col
    # None matched — log all available columns clearly
    logger.error(f"  ✗ {instrument}: No rate column matched.")
    logger.error(f"    Tried: {candidates}")
    logger.error(f"    Available columns in FITS: {col_names}")
    raise ValueError(
        f"No rate column found for {instrument}. "
        f"Available: {col_names}. "
        f"Tried: {candidates}. "
        f"Please share `hdul.info()` output."
    )


def _resolve_rate_array(raw_data, col_name: str, instrument: str):
    """
    Handle multi-dimensional rate columns.

    DESIGN DECISION (explicitly documented per user request):
    ─────────────────────────────────────────────────────────
    If a rate column is 2D (e.g. shape = [n_time, n_energy_channels] or
    [n_energy_channels, n_time]), we SUM across energy channels to produce
    a single total-integrated-counts time series.

    Rationale: For flare detection and the Neupert Effect analysis, the
    dashboard needs total broadband flux, not per-channel spectra.
    If per-channel analysis is needed later, the raw FITS should be used
    directly, and E_MIN/E_MAX header values consulted for band selection.
    ─────────────────────────────────────────────────────────
    """
    arr = np.array(raw_data, dtype=np.float64)

    if arr.ndim == 1:
        logger.info(f"  {instrument} rate array: 1D, {len(arr)} samples")
        return arr

    if arr.ndim == 2:
        # Determine which axis is time (the longer one) vs energy channels
        if arr.shape[0] > arr.shape[1]:
            # Shape: [n_time, n_energy] → sum along axis=1
            logger.info(
                f"  {instrument} rate array: 2D shape {arr.shape} "
                f"→ summing across {arr.shape[1]} energy channels (axis=1)"
            )
            return arr.sum(axis=1)
        else:
            # Shape: [n_energy, n_time] → sum along axis=0
            logger.info(
                f"  {instrument} rate array: 2D shape {arr.shape} "
                f"→ summing across {arr.shape[0]} energy channels (axis=0)"
            )
            return arr.sum(axis=0)

    # 3D+ is unexpected — flatten with warning
    logger.warning(
        f"  {instrument} rate array: unexpected {arr.ndim}D shape {arr.shape}. "
        f"Flattening to 1D — results may be incorrect."
    )
    return arr.flatten()


def _clean_flux(arr, instrument: str):
    """Replace NaN, inf, and negative values with None (will become null in JSON)."""
    cleaned = []
    nan_count = 0
    neg_count = 0
    for v in arr:
        if np.isnan(v) or np.isinf(v):
            cleaned.append(None)
            nan_count += 1
        elif v < 0:
            cleaned.append(None)
            neg_count += 1
        else:
            cleaned.append(float(v))
    if nan_count > 0:
        logger.warning(f"  {instrument}: {nan_count} NaN/inf values replaced with null")
    if neg_count > 0:
        logger.warning(f"  {instrument}: {neg_count} negative values replaced with null")
    return cleaned


def parse_solexs(filepath: Path) -> dict:
    """
    Parse SoLEXS Level-1 FITS file.
    SoLEXS stores time-series X-ray counts in a binary table extension.
    Columns vary by file version — inspect with fits.info() first.
    """
    logger.info(f"Parsing SoLEXS: {filepath.name}")

    with fits.open(filepath) as hdul:
        # Print structure for developer reference
        hdul.info()

        # SoLEXS Level-1 structure (typical):
        # Extension 0: PRIMARY (header only)
        # Extension 1: RATE or LIGHTCURVE (binary table)
        #   Columns: TIME, RATE, ERROR, QUALITY

        # Try extension 1 first, fall back to 2
        ext = 1
        try:
            data = hdul[ext].data
            if data is None:
                raise ValueError("Extension 1 has no data")
        except Exception:
            ext = 2
            data = hdul[ext].data

        header = hdul[ext].header
        col_names = list(data.names)
        logger.info(f"  Extension {ext} columns: {col_names}")

        # ── Time column ──
        if 'TIME' not in col_names:
            logger.error(f"  ✗ TIME column not found. Available: {col_names}")
            raise ValueError(f"TIME column missing in SoLEXS FITS. Available: {col_names}")

        time_col = data['TIME']

        # Convert MET (Mission Elapsed Time) → UTC using MJDREFI + MJDREFF
        mjdrefi = header.get('MJDREFI', 0)
        mjdreff = header.get('MJDREFF', 0)
        mjdref = mjdrefi + mjdreff
        logger.info(f"  MJDREFI={mjdrefi}, MJDREFF={mjdreff}, MJDREF={mjdref}")

        times_mjd = mjdref + time_col / 86400.0
        times_utc = Time(times_mjd, format='mjd', scale='utc')
        timestamps = times_utc.iso.tolist()

        # ── Rate column ──
        rate_col_name = _find_rate_column(col_names, SOLEXS_RATE_COLUMNS, "SoLEXS")
        raw_rate = data[rate_col_name]

        # Log energy range from header (useful for future per-band analysis)
        e_min = header.get('E_MIN', header.get('E_LO', 'unknown'))
        e_max = header.get('E_MAX', header.get('E_HI', 'unknown'))
        logger.info(f"  Energy range from header: E_MIN={e_min}, E_MAX={e_max}")

        # Handle 2D arrays (see _resolve_rate_array docstring for design decision)
        rate = _resolve_rate_array(raw_rate, rate_col_name, "SoLEXS")

        # Ensure time and rate arrays match in length
        min_len = min(len(timestamps), len(rate))
        timestamps = timestamps[:min_len]
        rate = rate[:min_len]

        # Clean NaN/negative values
        flux = _clean_flux(rate, "SoLEXS")

        logger.info(f"  ✓ SoLEXS parsed: {len(timestamps)} data points")

        return {
            "instrument": "SoLEXS",
            "energy_range_kev": [
                float(e_min) if isinstance(e_min, (int, float)) else 2.0,
                float(e_max) if isinstance(e_max, (int, float)) else 22.0
            ],
            "observation_date": "2024-05-10",
            "event": "X2.2 Gannon Storm",
            "units": "counts/second",
            "timestamps": timestamps,
            "flux": flux,
            "source_file": filepath.name,
            "is_real_data": True
        }


def parse_helios(filepath: Path) -> dict:
    """
    Parse HEL1OS Level-1 FITS file.
    HEL1OS operates in event mode — individual photon events.
    Must be binned into a light curve first.
    """
    logger.info(f"Parsing HEL1OS: {filepath.name}")

    with fits.open(filepath) as hdul:
        hdul.info()

        # HEL1OS Level-1 structure (typical):
        # Extension 0: PRIMARY
        # Extension 1: EVENTS (binary table)
        #   Columns: TIME, ENERGY, GRADE, PI
        # OR already binned:
        # Extension 1: RATE with TIME, RATE columns

        ext_data = hdul[1].data
        col_names = list(ext_data.names)
        logger.info(f"  Extension 1 columns: {col_names}")

        header = hdul[1].header
        mjdrefi = header.get('MJDREFI', 0)
        mjdreff = header.get('MJDREFF', 0)
        mjdref = mjdrefi + mjdreff
        logger.info(f"  MJDREFI={mjdrefi}, MJDREFF={mjdreff}, MJDREF={mjdref}")

        # Log energy range from header
        e_min = header.get('E_MIN', header.get('E_LO', 'unknown'))
        e_max = header.get('E_MAX', header.get('E_HI', 'unknown'))
        logger.info(f"  Energy range from header: E_MIN={e_min}, E_MAX={e_max}")

        if 'ENERGY' in col_names or 'PI' in col_names:
            # ── Event mode → bin into 10-second light curve ──
            logger.info("  HEL1OS in EVENT mode — binning into 10s light curve")
            event_times = ext_data['TIME']

            t_start = event_times.min()
            t_end = event_times.max()
            bin_size = 10.0  # seconds

            bins = np.arange(t_start, t_end + bin_size, bin_size)
            counts, edges = np.histogram(event_times, bins=bins)
            bin_centers = (edges[:-1] + edges[1:]) / 2
            count_rates = counts / bin_size  # counts/sec

            times_mjd = mjdref + bin_centers / 86400.0
            times_utc = Time(times_mjd, format='mjd', scale='utc')
            timestamps = times_utc.iso.tolist()
            flux_arr = count_rates

        else:
            # ── Pre-binned light curve ──
            logger.info("  HEL1OS in pre-binned RATE mode")

            if 'TIME' not in col_names:
                logger.error(f"  ✗ TIME column not found. Available: {col_names}")
                raise ValueError(f"TIME column missing in HEL1OS FITS. Available: {col_names}")

            time_col = ext_data['TIME']
            times_mjd = mjdref + time_col / 86400.0
            times_utc = Time(times_mjd, format='mjd', scale='utc')
            timestamps = times_utc.iso.tolist()

            rate_col_name = _find_rate_column(col_names, HELIOS_RATE_COLUMNS, "HEL1OS")
            raw_rate = ext_data[rate_col_name]

            # Handle 2D arrays (see _resolve_rate_array docstring for design decision)
            flux_arr = _resolve_rate_array(raw_rate, rate_col_name, "HEL1OS")

        # Ensure lengths match
        min_len = min(len(timestamps), len(flux_arr))
        timestamps = timestamps[:min_len]
        flux_arr = flux_arr[:min_len]

        # Clean NaN/negative values
        flux = _clean_flux(flux_arr, "HEL1OS")

        logger.info(f"  ✓ HEL1OS parsed: {len(timestamps)} data points")

        return {
            "instrument": "HEL1OS",
            "energy_range_kev": [
                float(e_min) if isinstance(e_min, (int, float)) else 10.0,
                float(e_max) if isinstance(e_max, (int, float)) else 150.0
            ],
            "observation_date": "2024-05-10",
            "event": "X2.2 Gannon Storm",
            "units": "counts/second",
            "timestamps": timestamps,
            "flux": flux,
            "source_file": filepath.name,
            "is_real_data": True
        }


def inspect_fits():
    """Print hdul.info() for all FITS/GZ files, including extracted ones."""
    _extract_zips()
    fits_files = list(FITS_DIR.rglob("*.fits")) + list(FITS_DIR.rglob("*.gz"))
    if not fits_files:
        print(f"No FITS/GZ files found in {FITS_DIR}")
        return

    for fp in fits_files:
        print(f"\n{'=' * 60}")
        print(f"FILE: {fp.name}")
        print(f"{'=' * 60}")
        with fits.open(fp) as hdul:
            hdul.info()
            # Print column info for each extension
            for i, ext in enumerate(hdul):
                if hasattr(ext, 'data') and ext.data is not None and hasattr(ext.data, 'names'):
                    print(f"\n  Extension {i} columns: {list(ext.data.names)}")
                    for col_name in ext.data.names:
                        col_data = ext.data[col_name]
                        shape = np.array(col_data).shape if hasattr(col_data, '__len__') else 'scalar'
                        print(f"    {col_name}: shape={shape}, dtype={ext.data[col_name].dtype}")
                    # Print useful header keys
                    hdr = ext.header
                    for key in ['MJDREFI', 'MJDREFF', 'E_MIN', 'E_MAX', 'E_LO', 'E_HI',
                                'TSTART', 'TSTOP', 'DATE-OBS', 'INSTRUME', 'TELESCOP']:
                        if key in hdr:
                            print(f"    HEADER {key} = {hdr[key]}")


def main():
    _extract_zips()

    # Check for --inspect flag
    if '--inspect' in sys.argv:
        inspect_fits()
        return

    fits_files = list(FITS_DIR.rglob("*.fits")) + list(FITS_DIR.rglob("*.gz"))

    if not fits_files:
        print("=" * 60)
        print("ERROR: No FITS files found in backend/data/fits/")
        print("Follow the instructions in backend/data/README.md")
        print("=" * 60)
        return

    solexs_files = [f for f in fits_files if any(k in f.name.lower() for k in ['solexs', 'al1_slx', 'al1_solexs'])]
    helios_files = [f for f in fits_files if any(k in f.name.lower() for k in ['helios', 'hel1os', 'hls_'])]

    # Parse SoLEXS (wrapped in try/except so HEL1OS still runs on failure)
    if solexs_files:
        try:
            result = parse_solexs(solexs_files[0])
            out = OUTPUT_DIR / "solexs_20240510.json"
            with open(out, 'w') as f:
                json.dump(result, f, indent=2)
            logger.info(f"SoLEXS: {len(result['timestamps'])} data points → {out}")
        except Exception as e:
            logger.error(f"SoLEXS parsing FAILED: {e}")
            logger.error("Skipping SoLEXS — HEL1OS will still be attempted.")
    else:
        logger.warning("No SoLEXS FITS files found in fits/ directory.")

    # Parse HEL1OS (wrapped in try/except so SoLEXS result is preserved)
    if helios_files:
        try:
            result = parse_helios(helios_files[0])
            out = OUTPUT_DIR / "helios_20240510.json"
            with open(out, 'w') as f:
                json.dump(result, f, indent=2)
            logger.info(f"HEL1OS: {len(result['timestamps'])} data points → {out}")
        except Exception as e:
            logger.error(f"HEL1OS parsing FAILED: {e}")
            logger.error("Skipping HEL1OS — check column names and share hdul.info() output.")
    else:
        logger.warning("No HEL1OS FITS files found in fits/ directory.")

    print("\nDone. Run the FastAPI backend — endpoints will serve real data.")


if __name__ == "__main__":
    main()
