import numpy as np
from datetime import datetime
import pandas as pd

def classify_flare(flux: float) -> str:
    """Classifies a flare based on GOES standard X-ray flux thresholds."""
    if flux >= 1e-4: return 'X'
    if flux >= 1e-5: return 'M'
    if flux >= 1e-6: return 'C'
    return 'B'

def get_threshold_multiplier(flux_class: str) -> float:
    if flux_class == 'X': return 100.0
    if flux_class == 'M': return 10.0
    if flux_class == 'C': return 3.0
    return 1.5

def detect_flares(solexs_data: list, helios_data: list, window_size: int = 20):
    """
    Nowcasting Algorithm: Detects flares in real-time data using rolling medians.
    Includes Neupert Effect detection using HEL1OS data.
    """
    if not solexs_data:
        return []

    # Convert to pandas DataFrame for easy rolling window operations
    df_s = pd.DataFrame(solexs_data)
    df_s['time'] = pd.to_datetime(df_s['time_tag'])
    df_s = df_s.sort_values('time').reset_index(drop=True)
    
    # Calculate rolling median background
    df_s['background'] = df_s['flux'].rolling(window=window_size, min_periods=1).median()
    
    # Simple peak detection algorithm
    flares = []
    in_flare = False
    current_flare = {}
    
    for idx, row in df_s.iterrows():
        flux = row['flux']
        bg = row['background']
        
        # Base trigger: flux > 3x background (C-class trigger)
        is_spiking = flux > (bg * 3.0) and flux >= 1e-6
        
        if is_spiking and not in_flare:
            in_flare = True
            current_flare = {
                'start_time': row['time_tag'],
                'start_idx': idx,
                'peak_flux': flux,
                'peak_time': row['time_tag'],
                'peak_idx': idx,
            }
        elif in_flare:
            if flux > current_flare['peak_flux']:
                current_flare['peak_flux'] = flux
                current_flare['peak_time'] = row['time_tag']
                current_flare['peak_idx'] = idx
            
            # End condition: flux drops below 1.5x background or drops significantly from peak
            if flux < (bg * 1.5) or flux < (current_flare['peak_flux'] * 0.1):
                in_flare = False
                current_flare['end_time'] = row['time_tag']
                
                # Filter out very short spikes (noise)
                if idx - current_flare['start_idx'] >= 3:
                    current_flare['class'] = classify_flare(current_flare['peak_flux'])
                    flares.append(current_flare)
                current_flare = {}
                
    # If a flare is still ongoing at the end of the data window
    if in_flare and current_flare:
        current_flare['end_time'] = df_s.iloc[-1]['time_tag']
        if df_s.index[-1] - current_flare['start_idx'] >= 3:
            current_flare['class'] = classify_flare(current_flare['peak_flux'])
            flares.append(current_flare)

    # Cross-reference with HEL1OS for Neupert Effect
    df_h = pd.DataFrame(helios_data)
    if not df_h.empty:
        df_h['time'] = pd.to_datetime(df_h['time_tag'])
        df_h = df_h.sort_values('time')
        
    for flare in flares:
        flare['neupert_lead_minutes'] = None
        flare['confidence_score'] = 75.0 # Base confidence
        
        if not df_h.empty:
            # Look for HEL1OS peak in a 1-15 minute window BEFORE the SoLEXS peak
            solexs_peak_t = pd.to_datetime(flare['peak_time'])
            start_search = solexs_peak_t - pd.Timedelta(minutes=15)
            
            h_window = df_h[(df_h['time'] >= start_search) & (df_h['time'] <= solexs_peak_t)]
            if not h_window.empty:
                max_h = h_window.loc[h_window['counts_per_sec'].idxmax()]
                # If there's a significant HEL1OS spike (e.g. > 1000 counts)
                if max_h['counts_per_sec'] > 1000:
                    lead_time = (solexs_peak_t - max_h['time']).total_seconds() / 60.0
                    if 1.0 <= lead_time <= 10.0:
                        flare['neupert_lead_minutes'] = round(lead_time, 1)
                        flare['confidence_score'] = min(99.9, flare['confidence_score'] + 20.0)
        
        # Clean up internal tracking keys
        flare.pop('start_idx', None)
        flare.pop('peak_idx', None)
        
    return flares
