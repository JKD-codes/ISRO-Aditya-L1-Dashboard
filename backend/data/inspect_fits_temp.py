import zipfile, os
from pathlib import Path

FITS_DIR = Path('backend/data/fits')
EXTRACTED = FITS_DIR / 'extracted'
EXTRACTED.mkdir(exist_ok=True)

# Extract
for z in FITS_DIR.glob('*.zip'):
    print(f'Extracting {z.name}...')
    with zipfile.ZipFile(z, 'r') as zf:
        zf.extractall(EXTRACTED)

def get_fits_columns(filepath):
    cols = []
    try:
        with open(filepath, 'rb') as f:
            while True:
                block = f.read(2880)
                if not block: break
                for i in range(0, len(block), 80):
                    card = block[i:i+80].decode('ascii', errors='ignore')
                    if card.startswith('TTYPE'):
                        val = card.split('=')[1].split('/')[0].strip().strip("'")
                        cols.append(val)
    except Exception as e:
        pass
    return list(set(cols))

fits_files = list(EXTRACTED.rglob('*.fits')) + list(FITS_DIR.rglob('*.fits'))
print(f"Found {len(fits_files)} FITS files.")

for f in fits_files:
    cols = get_fits_columns(f)
    if cols:
        print(f'\n{f.name}:')
        print('  Columns:', cols)
