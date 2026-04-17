import time
import random
import requests
import os

API_URL = os.environ.get("API_URL", "http://backend:8000")

vehicles = {
    "EV001": {"battery": 85.0, "temp": 22.5, "lat": 37.7750, "lon": -122.4183},
    "EV002": {"battery": 62.0, "temp": 24.1, "lat": 37.7900, "lon": -122.4000},
    "EV003": {"battery": 28.0, "temp": 21.8, "lat": 37.7600, "lon": -122.4400},
}

print("EV Telemetry Simulator starting...", flush=True)
time.sleep(5)  # Wait for backend to be ready

while True:
    for vid, v in vehicles.items():
        # Simulate battery drain (0.3-0.8% per cycle) with occasional recharge
        if v["battery"] < 15:
            v["battery"] = random.uniform(70, 95)  # Recharge
        else:
            v["battery"] = max(0, v["battery"] - random.uniform(0.3, 0.8))

        v["temp"] = max(18, min(35, v["temp"] + random.uniform(-0.5, 0.5)))
        v["lat"] += random.uniform(-0.001, 0.001)
        v["lon"] += random.uniform(-0.001, 0.001)

        payload = {
            "vehicle_id": vid,
            "battery_percent": round(v["battery"], 2),
            "temperature": round(v["temp"], 2),
            "lat": round(v["lat"], 6),
            "lon": round(v["lon"], 6),
        }
        try:
            r = requests.post(f"{API_URL}/vehicles/update", json=payload, timeout=5)
            print(f"[{vid}] Battery={payload['battery_percent']}% Temp={payload['temperature']}°C → {r.status_code}", flush=True)
        except Exception as e:
            print(f"[{vid}] Error: {e}", flush=True)

    time.sleep(5)
