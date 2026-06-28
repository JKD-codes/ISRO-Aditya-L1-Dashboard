# Aditya-L1 Real Data Acquisition Instructions

Follow these steps to manually download real SoLEXS and HEL1OS observation data for the Gannon Storm X-class flare on May 10, 2024.

## Download Instructions

1. **Register & Log In:**
   - Visit the official ISSDC PRADAN portal: [https://pradan.issdc.gov.in/al1/](https://pradan.issdc.gov.in/al1/)
   - Create an account or log in to your existing ISRO portal account.

2. **Download SoLEXS Data:**
   - Navigate to: **SoLEXS** → **Level-1** → **2024-05-10** (or search for this date).
   - Find and download the FITS file containing the X2.2 flare from the Gannon Storm.
   - File pattern should look like: `al1_solexs_l1_*20240510*.fits`

3. **Download HEL1OS Data:**
   - Navigate to: **HEL1OS** → **Level-1** → **2024-05-10**.
   - Find and download the event / lightcurve FITS file for the same date.
   - File pattern should look like: `al1_helios_l1_*20240510*.fits`

4. **Directory Placement:**
   - Move both downloaded FITS files into this folder:
     `backend/data/fits/`

5. **Parse Data:**
   - Run the parsing script to unpack the binary tables into standard JSON files for the server:
     ```bash
     python backend/data/parse_fits.py
     ```
