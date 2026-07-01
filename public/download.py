import urllib.request
import os

url = "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0193.jpg"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, timeout=15) as response:
        content = response.read()
        with open('d:/AdityaL1/public/real_sun.jpg', 'wb') as f:
            f.write(content)
    print("Download successful.")
except Exception as e:
    print("Error:", e)
