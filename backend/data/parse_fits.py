import json
import numpy as np
from pathlib import Path
from astropy.io import fits
from astropy.time import Time

FITS_DIR = Path(__file__).parent / "fits"
OUTPUT_DIR = Path(__file__).parent / "processed"
OUTPUT_DIR.mkdir(exist_ok=True)
FITS_DIR.mkdir(exist_ok=True) # Ensure fits directory exists

def parse_solexs(filepath: Path) -> dict:
    """
    Parse SoLEXS Level-1 FITS file.
    SoLEXS stores time-series X-ray counts in a binary table extension.
    Columns vary by file version — inspect with fits.info() first.
    """
    with fits.open(filepath) as hdul:
        # Print structure so developer can identify correct extension
        hdul.info()
        
        # SoLEXS Level-1 structure (typical):
        # Extension 0: PRIMARY (header only)
        # Extension 1: RATE or LIGHTCURVE (binary table)
        #   Columns: TIME, RATE, ERROR, QUALITY
        
        # Try extension 1 first, fall back to 2
        ext = 1
        try:
            data = hdul[ext].data
        except Exception:
            ext = 2
            data = hdul[ext].data
        
        header = hdul[ext].header
        
        # Extract time column — SoLEXS uses MET (Mission Elapsed Time)
        # Convert to UTC using MJDREFI + MJDREFF from header
        time_col = data['TIME']
        
        mjdref = header.get('MJDREFI', 0) + header.get('MJDREFF', 0)
        times_mjd = mjdref + time_col / 86400.0
        times_utc = Time(times_mjd, format='mjd', scale='utc')
        timestamps = times_utc.iso.tolist()
        
        # Extract count rate — try multiple possible column names
        rate = None
        for col_name in ['RATE', 'COUNTS', 'FLUX', 'SXR_RATE']:
            if col_name in data.names:
                rate = data[col_name].tolist()
                break
        
        if rate is None:
            raise ValueError(f"No rate column found. Available: {data.names}")
        
        # Energy channel info from header
        e_min = header.get('E_MIN', 2.0)   # keV
        e_max = header.get('E_MAX', 22.0)  # keV
        
        return {
            "instrument": "SoLEXS",
            "energy_range_kev": [e_min, e_max],
            "observation_date": "2024-05-10",
            "event": "X2.2 Gannon Storm",
            "units": "counts/second",
            "timestamps": timestamps,
            "flux": [float(r) if r is not None and not np.isnan(r) else None for r in rate],
            "source_file": filepath.name,
            "is_real_data": True
        }


def parse_helios(filepath: Path) -> dict:
    """
    Parse HEL1OS Level-1 FITS file.
    HEL1OS operates in event mode — individual photon events.
    Must be binned into a light curve first.
    """
    with fits.open(filepath) as hdul:
        hdul.info()
        
        # HEL1OS Level-1 structure (typical):
        # Extension 0: PRIMARY
        # Extension 1: EVENTS (binary table)
        #   Columns: TIME, ENERGY, GRADE, PI
        # OR already binned:
        # Extension 1: RATE with TIME, RATE columns
        
        ext_data = hdul[1].data
        col_names = ext_data.names
        
        header = hdul[1].header
        mjdref = header.get('MJDREFI', 0) + header.get('MJDREFF', 0)
        
        if 'ENERGY' in col_names or 'PI' in col_names:
            # Event mode — bin into 10-second light curve
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
            flux = count_rates.tolist()
            
        else:
            # Pre-binned light curve
            time_col = ext_data['TIME']
            times_mjd = mjdref + time_col / 86400.0
            times_utc = Time(times_mjd, format='mjd', scale='utc')
            timestamps = times_utc.iso.tolist()
            
            for col in ['RATE', 'COUNTS', 'HXR_RATE']:
                if col in col_names:
                    flux = ext_data[col].tolist()
                    break
        
        return {
            "instrument": "HEL1OS",
            "energy_range_kev": [10, 150],
            "observation_date": "2024-05-10",
            "event": "X2.2 Gannon Storm",
            "units": "counts/second",
            "timestamps": timestamps,
            "flux": [float(r) for r in flux],
            "source_file": filepath.name,
            "is_real_data": True
        }


def main():
    fits_files = list(FITS_DIR.glob("*.fits"))
    
    if not fits_files:
        print("ERROR: No FITS files found in backend/data/fits/")
        print("Follow the instructions in backend/data/README.md")
        return
    
    solexs_files = [f for f in fits_files if 'solexs' in f.name.lower()]
    helios_files = [f for f in fits_files if 'helios' in f.name.lower() or
                                              'hel1os' in f.name.lower()]
    
    if solexs_files:
        result = parse_solexs(solexs_files[0])
        out = OUTPUT_DIR / "solexs_20240510.json"
        with open(out, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"SoLEXS: {len(result['timestamps'])} data points → {out}")
    
    if helios_files:
        result = parse_helios(helios_files[0])
        out = OUTPUT_DIR / "helios_20240510.json"
        with open(out, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"HEL1OS: {len(result['timestamps'])} data points → {out}")
    
    print("Done. Run the FastAPI backend — endpoints will serve real data.")

if __name__ == "__main__":
    main()
