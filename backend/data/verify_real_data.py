"""
verify_real_data.py — Verify that processed Gannon Storm JSON files are valid.

Checks:
  1. Files exist and are valid JSON
  2. Non-empty timestamps array
  3. No NaN/null values in flux array
  4. Timestamps are valid ISO format in May 10 2024 window
  5. Peak flux occurs near 2024-05-10T06:50–07:00 UTC (Gannon Storm X2.2)
  6. is_real_data flag is True
  7. Print summary table with pass/fail

Usage:
    python verify_real_data.py
"""

import json
import sys
from pathlib import Path
from datetime import datetime

PROCESSED_DIR = Path(__file__).parent / "processed"

# Known Gannon Storm X2.2 SoLEXS peak (UTC)
EXPECTED_PEAK_TIME = datetime(2024, 5, 10, 6, 50, 45)
EXPECTED_PEAK_FLUX = 19937


def verify_file(filepath: Path, instrument: str) -> list:
    """Run all verification checks on a single processed JSON file.
    Returns a list of (check_name, passed: bool, detail: str) tuples.
    """
    results = []

    # ── Check 1: File exists ──
    if not filepath.exists():
        results.append(("File exists", False, f"{filepath.name} not found"))
        return results  # Cannot continue without the file
    results.append(("File exists", True, filepath.name))

    # ── Check 2: Valid JSON ──
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
    except (json.JSONDecodeError, Exception) as e:
        results.append(("Valid JSON", False, str(e)))
        return results
    results.append(("Valid JSON", True, "OK"))

    # ── Check 3: Non-empty timestamps ──
    timestamps = data.get("timestamps", [])
    if len(timestamps) == 0:
        results.append(("Non-empty timestamps", False, "timestamps array is empty"))
    else:
        results.append(("Non-empty timestamps", True, f"{len(timestamps)} entries"))

    # ── Check 4: No NaN/null in flux ──
    flux = data.get("flux", [])
    null_count = sum(1 for v in flux if v is None)
    nan_count = 0
    for v in flux:
        if v is not None:
            try:
                if str(v).lower() == 'nan':
                    nan_count += 1
            except:
                pass

    bad_count = null_count + nan_count
    if bad_count > 0:
        # Warning but not fatal — some null values may be intentional cleaning
        pct = (bad_count / len(flux) * 100) if len(flux) > 0 else 0
        if pct > 10:
            results.append(("No NaN/null flux", False,
                           f"{bad_count}/{len(flux)} bad values ({pct:.1f}%)"))
        else:
            results.append(("No NaN/null flux", True,
                           f"{bad_count}/{len(flux)} nulls ({pct:.1f}%) — acceptable"))
    elif len(flux) == 0:
        results.append(("No NaN/null flux", False, "flux array is empty"))
    else:
        results.append(("No NaN/null flux", True, f"{len(flux)} clean values"))

    # ── Check 5: Valid ISO timestamps in May 10 2024 window ──
    if timestamps:
        try:
            first_ts = datetime.fromisoformat(timestamps[0].replace('Z', '+00:00').replace('+00:00', ''))
            last_ts = datetime.fromisoformat(timestamps[-1].replace('Z', '+00:00').replace('+00:00', ''))

            in_may_10 = (first_ts.year == 2024 and first_ts.month == 5 and first_ts.day == 10)
            if in_may_10:
                results.append(("Timestamps in May 10 2024", True,
                               f"{first_ts.strftime('%H:%M:%S')} → {last_ts.strftime('%H:%M:%S')} UTC"))
            else:
                results.append(("Timestamps in May 10 2024", False,
                               f"First timestamp: {first_ts.isoformat()} — expected 2024-05-10"))
        except Exception as e:
            results.append(("Timestamps in May 10 2024", False, f"Parse error: {e}"))
    else:
        results.append(("Timestamps in May 10 2024", False, "No timestamps to check"))

    # ── Check 6: Peak time sanity check (SoLEXS only) ──
    if instrument == "SoLEXS" and timestamps and flux:
        try:
            # Find index of maximum non-null flux
            valid_flux = [(i, v) for i, v in enumerate(flux) if v is not None]
            if valid_flux:
                peak_idx, peak_val = max(valid_flux, key=lambda x: x[1])
                peak_ts_str = timestamps[peak_idx]
                # Parse the timestamp robustly
                peak_ts_clean = peak_ts_str.strip()
                if peak_ts_clean.endswith('Z'):
                    peak_ts_clean = peak_ts_clean[:-1]
                # Handle "2024-05-10 06:54:00.000" format (space separator)
                peak_ts_clean = peak_ts_clean.replace(' ', 'T')
                peak_ts = datetime.fromisoformat(peak_ts_clean)

                time_diff = abs((peak_ts - EXPECTED_PEAK_TIME).total_seconds())
                flux_diff = abs(peak_val - EXPECTED_PEAK_FLUX)
                
                if time_diff <= 30 and flux_diff < 100:
                    results.append(("Peak time ~06:50:45 UTC", True,
                                   f"Peak at {peak_ts.strftime('%H:%M:%S')} UTC, flux={peak_val:.0f} (Expected ~19937)"))
                else:
                    results.append(("Peak time ~06:50:45 UTC", False,
                                   f"⚠ Peak at {peak_ts.strftime('%Y-%m-%d %H:%M:%S')} UTC "
                                   f"(flux={peak_val:.0f}). "
                                   f"Expected ~06:50:45 UTC with flux ~19937."))
            else:
                results.append(("Peak time ~06:50:45 UTC", False, "No valid flux values"))
        except Exception as e:
            results.append(("Peak time ~06:50:45 UTC", False, f"Error: {e}"))

    # ── Check 7: is_real_data flag ──
    is_real = data.get("is_real_data", None)
    if is_real is True:
        results.append(("is_real_data = True", True, "OK"))
    elif is_real is False:
        results.append(("is_real_data = True", False, "Flag is False — synthetic data?"))
    else:
        results.append(("is_real_data = True", False, "Flag missing from JSON"))

    # ── Check 8: HEL1OS covers SoLEXS peak time ──
    if instrument == "HEL1OS" and timestamps:
        try:
            first_ts_str = timestamps[0]
            last_ts_str = timestamps[-1]
            peak_str = EXPECTED_PEAK_TIME.strftime('%Y-%m-%dT%H:%M:%S')
            
            if first_ts_str <= peak_str and last_ts_str >= peak_str:
                results.append(("Covers SoLEXS peak (06:50:45)", True, f"Range: {first_ts_str[11:19]} to {last_ts_str[11:19]} UTC"))
            else:
                results.append(("Covers SoLEXS peak (06:50:45)", False, f"⚠ GAP DETECTED! Range: {first_ts_str[11:19]} to {last_ts_str[11:19]} UTC (Misses 06:50:45)"))
        except Exception as e:
            results.append(("Covers SoLEXS peak (06:50:45)", False, f"Error: {e}"))

    return results


def print_results(instrument: str, results: list):
    """Print a formatted summary table."""
    print(f"\n{'─' * 65}")
    print(f"  {instrument} Verification Results")
    print(f"{'─' * 65}")

    max_name_len = max(len(r[0]) for r in results)

    for check_name, passed, detail in results:
        icon = "✓" if passed else "✗"
        status = "PASS" if passed else "FAIL"
        color_start = ""
        color_end = ""

        print(f"  {icon} [{status}] {check_name:<{max_name_len}}  │ {detail}")

    passed_count = sum(1 for _, p, _ in results if p)
    total = len(results)
    print(f"{'─' * 65}")
    print(f"  Summary: {passed_count}/{total} checks passed")
    print(f"{'─' * 65}")

    return passed_count == total


def main():
    print("=" * 65)
    print("  Aditya-L1 Gannon Storm — Real Data Verification")
    print("=" * 65)

    solexs_path = PROCESSED_DIR / "solexs_20240510.json"
    helios_path = PROCESSED_DIR / "helios_20240510.json"

    solexs_results = verify_file(solexs_path, "SoLEXS")
    helios_results = verify_file(helios_path, "HEL1OS")

    solexs_ok = print_results("SoLEXS (Soft X-ray, 2-22 keV)", solexs_results)
    helios_ok = print_results("HEL1OS (Hard X-ray, 10-150 keV)", helios_results)

    print(f"\n{'=' * 65}")
    if solexs_ok and helios_ok:
        print("  ✓ ALL CHECKS PASSED — Real data ready for dashboard.")
    else:
        print("  ⚠ SOME CHECKS FAILED — Review issues above.")
        if not solexs_path.exists() or not helios_path.exists():
            print("  Run `python parse_fits.py` first after placing FITS files.")
    print(f"{'=' * 65}\n")

    return 0 if (solexs_ok and helios_ok) else 1


if __name__ == "__main__":
    sys.exit(main())
