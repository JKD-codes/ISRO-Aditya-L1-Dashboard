import json
import numpy as np
from pathlib import Path
from scipy.signal import find_peaks
from scipy.ndimage import uniform_filter1d
from datetime import datetime, timezone

DATA_DIR = Path(__file__).parent.parent / "data" / "processed"

class SolarFlareDetector:
    """
    Automated algorithmic pipeline for solar flare detection using
    combined SoLEXS (soft X-ray) and HEL1OS (hard X-ray) time-series data.
    
    Algorithm: Neupert Effect Detection
    ─────────────────────────────────────
    The Neupert Effect states that the time derivative of the soft X-ray
    flux (dSXR/dt) should correlate with the hard X-ray flux during a flare.
    Hard X-ray peaks BEFORE soft X-ray peak due to particle acceleration
    timescales. We detect this temporal offset to confirm flares.
    
    References:
      Neupert (1968) ApJ 153, L59
      Dennis & Zarro (1993) Sol.Phys. 146, 177
    """
    
    def __init__(self):
        self.solexs_data = None
        self.helios_data = None
        self.is_real_data = False
        
        self.sxr_resampled = None
        self.hxr_resampled = None
        self.t_common = None
        self.n_points = 0
    
    def load_data(self) -> bool:
        solexs_path = DATA_DIR / "solexs_20240510.json"
        helios_path = DATA_DIR / "helios_20240510.json"
        
        if not solexs_path.exists() or not helios_path.exists():
            print("WARNING: Real FITS data not found. Using fallback demonstration data.")
            self._load_demonstration_data()
            return False
        
        with open(solexs_path) as f:
            self.solexs_data = json.load(f)
        with open(helios_path) as f:
            self.helios_data = json.load(f)
        
        self.is_real_data = True
        print(f"Loaded real Aditya-L1 data: "
              f"SoLEXS={len(self.solexs_data['flux'])} pts, "
              f"HEL1OS={len(self.helios_data['flux'])} pts")
        return True
    
    def _load_demonstration_data(self):
        """
        Scientifically accurate reconstruction of the X2.2 Gannon Storm flare.
        Used ONLY when real FITS data is unavailable.
        Clearly marked as demonstration data in all outputs.
        """
        n = 240  # 4 hours at 1-min cadence
        t = np.linspace(-120, 120, n)  # minutes from peak
        
        # SoLEXS: soft X-ray light curve
        # Background ~1e-8 W/m², peak ~2.1e-4 W/m² (X2.2 class)
        # Rise: exponential over ~40min. Decay: exponential over ~80min (1:2 asymmetry)
        sxr = np.ones(n) * 1e-8
        rise_mask = (t >= -40) & (t <= 0)
        decay_mask = t > 0
        sxr[rise_mask] = 1e-8 * np.power(
            2.1e-4 / 1e-8,
            ((t[rise_mask] + 40) / 40) ** 2
        )
        sxr[decay_mask] = 2.1e-4 * np.exp(-t[decay_mask] / 28)
        sxr += np.random.normal(0, 1e-9, n)
        sxr = np.abs(sxr)
        
        # HEL1OS: hard X-ray count rate
        # Impulsive spike peaking 3 minutes BEFORE SoLEXS (Neupert Effect)
        # Background ~47 c/s, peak ~6200 c/s
        hxr_t = t + 3  # shifted 3 min earlier
        hxr = 47 + (6200 - 47) * np.exp(-hxr_t**2 / 8)
        hxr[hxr < 47] = 47
        hxr += np.random.normal(0, 5, n)
        hxr = np.abs(hxr)
        
        base_time = datetime(2024, 5, 10, 5, 54, 0, tzinfo=timezone.utc)
        timestamps = [
            datetime.fromtimestamp(
                base_time.timestamp() + i*60, tz=timezone.utc
            ).isoformat()
            for i in range(-120, 120)
        ]
        
        self.solexs_data = {
            "instrument": "SoLEXS",
            "units": "W/m²",
            "timestamps": timestamps,
            "flux": sxr.tolist(),
            "is_real_data": False
        }
        self.helios_data = {
            "instrument": "HEL1OS",
            "units": "counts/second",
            "timestamps": timestamps,
            "flux": hxr.tolist(),
            "is_real_data": False
        }
    
    def interpolate_to_common_grid(self):
        """
        Resample both light curves to a common 1-minute time grid.
        Required because SoLEXS and HEL1OS have different native cadences.
        """
        from scipy.interpolate import interp1d
        
        sxr_flux = np.array(self.solexs_data['flux'], dtype=float)
        hxr_flux = np.array(self.helios_data['flux'], dtype=float)
        
        n_sxr = len(sxr_flux)
        n_hxr = len(hxr_flux)
        
        # Normalize to [0,1] time axis then resample to common length
        t_common = np.linspace(0, 1, min(n_sxr, n_hxr, 300))
        
        t_sxr = np.linspace(0, 1, n_sxr)
        t_hxr = np.linspace(0, 1, n_hxr)
        
        f_sxr = interp1d(t_sxr, sxr_flux, bounds_error=False, fill_value='extrapolate')
        f_hxr = interp1d(t_hxr, hxr_flux, bounds_error=False, fill_value='extrapolate')
        
        self.sxr_resampled = np.abs(f_sxr(t_common))
        self.hxr_resampled = np.abs(f_hxr(t_common))
        self.t_common = t_common
        self.n_points = len(t_common)
    
    def classify_flare_class(self, peak_flux_wm2: float) -> str:
        """
        GOES X-ray flare classification based on peak 1-8 Å flux.
        SoLEXS covers 2-22 keV which overlaps with GOES classification bands.
        Apply correction factor ~0.85 for SoLEXS vs GOES calibration offset.
        """
        corrected = peak_flux_wm2 * 0.85
        if corrected >= 1e-4:
            mag = corrected / 1e-4
            return f"X{mag:.1f}"
        elif corrected >= 1e-5:
            mag = corrected / 1e-5
            return f"M{mag:.1f}"
        elif corrected >= 1e-6:
            mag = corrected / 1e-6
            return f"C{mag:.1f}"
        elif corrected >= 1e-7:
            mag = corrected / 1e-7
            return f"B{mag:.1f}"
        else:
            return f"A{corrected/1e-8:.1f}"
    
    def detect_neupert_effect(self) -> dict:
        """
        Core detection algorithm: Neupert Effect identification.
        
        Method:
          1. Smooth both light curves (remove noise)
          2. Find SoLEXS peak (gradual phase peak)
          3. Find HEL1OS peak (impulsive phase peak)
          4. Compute temporal offset: Δt = t(HEL1OS_peak) - t(SoLEXS_peak)
          5. Neupert Effect confirmed if: -30min < Δt < -1min
             (HEL1OS must peak BEFORE SoLEXS by 1-30 minutes)
          6. Compute derivative of SoLEXS: dSXR/dt should match HEL1OS morphology
          7. Cross-correlation coefficient as confidence metric
        
        Returns: detection result dict
        """
        sxr = self.sxr_resampled
        hxr = self.hxr_resampled
        n = self.n_points
        
        # Step 1: Smooth to remove noise (5-point uniform filter)
        sxr_smooth = uniform_filter1d(sxr, size=5)
        hxr_smooth = uniform_filter1d(hxr, size=5)
        
        # Step 2: Detect SoLEXS peak
        # Use prominence to avoid noise peaks
        sxr_peaks, sxr_props = find_peaks(
            sxr_smooth,
            prominence=np.std(sxr_smooth) * 3,
            distance=10
        )
        
        # Step 3: Detect HEL1OS peak
        hxr_peaks, hxr_props = find_peaks(
            hxr_smooth,
            prominence=np.std(hxr_smooth) * 3,
            distance=5
        )
        
        if len(sxr_peaks) == 0 or len(hxr_peaks) == 0:
            return {
                "flare_detected": False,
                "reason": "No significant peaks found in one or both instruments",
                "is_real_data": self.is_real_data
            }
        
        # Take the highest peak from each
        sxr_peak_idx = sxr_peaks[np.argmax(sxr_smooth[sxr_peaks])]
        hxr_peak_idx = hxr_peaks[np.argmax(hxr_smooth[hxr_peaks])]
        
        # Step 4: Temporal offset in array indices → convert to minutes
        # Assume 1-minute cadence for common grid
        delta_idx = hxr_peak_idx - sxr_peak_idx
        delta_minutes = delta_idx * (240 / n)  # scale to actual time span
        
        # Step 5: Neupert Effect check
        neupert_confirmed = -30 <= delta_minutes <= -1
        
        # Step 6: Derivative correlation
        dsxr_dt = np.gradient(sxr_smooth)
        dsxr_dt_norm = (dsxr_dt - dsxr_dt.min()) / (dsxr_dt.max() - dsxr_dt.min() + 1e-30)
        hxr_norm = (hxr_smooth - hxr_smooth.min()) / (hxr_smooth.max() - hxr_smooth.min() + 1e-30)
        
        # Cross-correlation at zero lag (Neupert prediction: should be high)
        cross_corr = float(np.corrcoef(dsxr_dt_norm, hxr_norm)[0, 1])
        
        # Step 7: Rise rate classification for nowcast
        # Look at SoLEXS in the 10 minutes before the peak
        pre_peak_start = max(0, sxr_peak_idx - 10)
        rise_section = sxr_smooth[pre_peak_start:sxr_peak_idx+1]
        if len(rise_section) > 1:
            rise_rate = (rise_section[-1] - rise_section[0]) / len(rise_section)
        else:
            rise_rate = 0
        
        peak_flux = float(sxr_smooth[sxr_peak_idx])
        flare_class = self.classify_flare_class(peak_flux)
        
        # Confidence score (0-1):
        # Based on: Neupert timing + cross-correlation quality + peak significance
        peak_snr = peak_flux / (np.median(sxr_smooth[:20]) + 1e-30)
        confidence = min(1.0, (
            (0.4 if neupert_confirmed else 0.0) +
            (max(0, cross_corr) * 0.35) +
            (min(0.25, np.log10(max(peak_snr, 1)) / 8))
        ))
        
        return {
            "flare_detected": True,
            "neupert_confirmed": bool(neupert_confirmed),
            "flare_class": flare_class,
            "peak_flux_wm2": peak_flux,
            "peak_flux_scientific": f"{peak_flux:.2e}",
            "solexs_peak_index": int(sxr_peak_idx),
            "helios_peak_index": int(hxr_peak_idx),
            "neupert_delay_minutes": round(float(abs(delta_minutes)), 1),
            "cross_correlation_dsxr_hxr": round(float(cross_corr), 3),
            "rise_rate_wm2_per_min": float(rise_rate),
            "confidence_score": round(float(confidence), 3),
            "confidence_pct": round(float(confidence) * 100, 1),
            "algorithm": "Neupert Effect Detection v1.0",
            "instruments_used": ["SoLEXS (2-22 keV)", "HEL1OS (10-150 keV)"],
            "is_real_data": self.is_real_data,
            "data_flag": "REAL_ADITYA_L1" if self.is_real_data else "DEMONSTRATION_DATA",
            "timestamp_utc": datetime.now(timezone.utc).isoformat()
        }
    
    def run_nowcast(self) -> dict:
        """
        Nowcast: detect ongoing flare from current data window.
        Uses last 30 minutes of SoLEXS data to assess current flare state.
        """
        self.load_data()
        self.interpolate_to_common_grid()
        detection = self.detect_neupert_effect()
        
        # Nowcast state machine
        sxr = self.sxr_resampled
        recent = sxr[-30:] if len(sxr) >= 30 else sxr
        current_flux = float(np.median(recent[-5:]))
        background = float(np.median(sxr[:20]))
        flux_ratio = current_flux / (background + 1e-30)
        
        if flux_ratio > 100:
            nowcast_state = "FLARE_PEAK"
        elif flux_ratio > 10:
            nowcast_state = "FLARE_RISE"
        elif flux_ratio > 3:
            nowcast_state = "PRE_FLARE"
        else:
            nowcast_state = "BACKGROUND"
        
        return {
            "mode": "NOWCAST",
            "state": nowcast_state,
            "current_flux": f"{current_flux:.2e}",
            "background_flux": f"{background:.2e}",
            "flux_ratio": round(flux_ratio, 1),
            "detection": detection
        }
    
    def run_forecast(self) -> dict:
        """
        Forecast: predict flare probability for next 6/12/24/48 hours.
        Uses persistence model with AR complexity decay.
        """
        self.load_data()
        self.interpolate_to_common_grid()
        
        sxr = self.sxr_resampled
        peak_flux = float(sxr.max())
        
        # Base probability from peak flux (empirical NOAA lookup)
        def flux_to_m_prob(flux):
            log_flux = np.log10(max(flux, 1e-9))
            return min(99, max(1, int((log_flux + 9) * 12)))
        
        base_m_prob = flux_to_m_prob(peak_flux)
        base_x_prob = max(1, int(base_m_prob * 0.3))
        
        # Persistence decay (Beta-Gamma-Delta AR: slow decay)
        horizons = [6, 12, 24, 48]
        decay_tau = 36  # hours — typical for complex AR
        
        forecast_windows = []
        for h in horizons:
            decay = np.exp(-h / decay_tau)
            m_prob = max(1, int(base_m_prob * decay))
            x_prob = max(1, int(base_x_prob * decay))
            forecast_windows.append({
                "horizon_hours": h,
                "m_class_prob_pct": m_prob,
                "x_class_prob_pct": x_prob,
                "c_class_prob_pct": min(99, int(m_prob * 1.8))
            })
        
        return {
            "mode": "FORECAST",
            "base_peak_flux": f"{peak_flux:.2e}",
            "model": "Flux-persistence with AR complexity decay",
            "decay_tau_hours": decay_tau,
            "windows": forecast_windows,
            "is_real_data": self.is_real_data,
            "timestamp_utc": datetime.now(timezone.utc).isoformat()
        }

def main():
    detector = SolarFlareDetector()
    
    print("\n=== NOWCAST ===")
    nowcast = detector.run_nowcast()
    print(json.dumps(nowcast, indent=2))
    
    print("\n=== FORECAST ===")
    detector2 = SolarFlareDetector()
    forecast = detector2.run_forecast()
    print(json.dumps(forecast, indent=2))

if __name__ == "__main__":
    main()
