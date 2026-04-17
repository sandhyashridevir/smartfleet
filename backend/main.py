from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
import psycopg2
import psycopg2.extras
import numpy as np
import os
import math
from datetime import datetime

app = FastAPI(title="Smart EV Fleet Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_URL = os.environ.get("DATABASE_URL", "postgresql://evfleet:evfleet@db:5432/evfleet")

def get_conn():
    return psycopg2.connect(DB_URL)

def success(data):
    return {"status": "success", "data": data}

class TelemetryInput(BaseModel):
    vehicle_id: str
    battery_percent: float
    temperature: float
    lat: float
    lon: float

    @validator("battery_percent")
    def battery_range(cls, v):
        if not (0 <= v <= 100):
            raise ValueError("battery_percent must be 0-100")
        return v

    @validator("temperature")
    def temp_range(cls, v):
        if not (-50 <= v <= 100):
            raise ValueError("temperature out of range")
        return v

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def get_stations(cur):
    cur.execute("SELECT name, lat, lon FROM charging_stations")
    return cur.fetchall()

def get_latest_position(cur, vehicle_id):
    cur.execute(
        "SELECT lat, lon, battery_percent FROM ev_telemetry WHERE vehicle_id=%s ORDER BY timestamp DESC LIMIT 1",
        (vehicle_id,)
    )
    return cur.fetchone()

def find_nearest_station(vehicle_lat, vehicle_lon, stations):
    best, best_dist = None, float('inf')
    for name, lat, lon in stations:
        d = haversine(vehicle_lat, vehicle_lon, lat, lon)
        if d < best_dist:
            best_dist, best = d, name
    return best, best_dist

@app.post("/vehicles/update")
def update_vehicle(data: TelemetryInput):
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO ev_telemetry (vehicle_id, battery_percent, temperature, lat, lon, timestamp) VALUES (%s,%s,%s,%s,%s,%s)",
            (data.vehicle_id, data.battery_percent, data.temperature, data.lat, data.lon, datetime.utcnow())
        )
        conn.commit()
        cur.close(); conn.close()
        return success({"message": f"Telemetry stored for {data.vehicle_id}"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/vehicles/status")
def vehicle_status():
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT DISTINCT ON (vehicle_id) vehicle_id, battery_percent, temperature, lat, lon, timestamp
            FROM ev_telemetry ORDER BY vehicle_id, timestamp DESC
        """)
        rows = cur.fetchall()
        cur.close(); conn.close()
        return success([dict(r) for r in rows])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/vehicles/history/{vehicle_id}")
def vehicle_history(vehicle_id: str):
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT battery_percent, temperature, timestamp FROM ev_telemetry WHERE vehicle_id=%s ORDER BY timestamp DESC LIMIT 60",
            (vehicle_id,)
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return success([dict(r) for r in rows])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/vehicles/nearest_station/{vehicle_id}")
def nearest_station(vehicle_id: str):
    try:
        conn = get_conn()
        cur = conn.cursor()
        pos = get_latest_position(cur, vehicle_id)
        if not pos:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        lat, lon, _ = pos
        stations = get_stations(cur)
        name, dist = find_nearest_station(lat, lon, stations)
        cur.close(); conn.close()
        return success({"vehicle_id": vehicle_id, "nearest_station": name, "distance_km": round(dist, 2)})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/vehicles/distance/{vehicle_id}/{station_name}")
def distance_to_station(vehicle_id: str, station_name: str):
    try:
        conn = get_conn()
        cur = conn.cursor()
        pos = get_latest_position(cur, vehicle_id)
        if not pos:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        lat, lon, _ = pos
        cur.execute("SELECT lat, lon FROM charging_stations WHERE name=%s", (station_name,))
        st = cur.fetchone()
        if not st:
            raise HTTPException(status_code=404, detail="Station not found")
        dist = haversine(lat, lon, st[0], st[1])
        cur.close(); conn.close()
        return success({"vehicle_id": vehicle_id, "station": station_name, "distance_km": round(dist, 2)})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/vehicles/predict/{vehicle_id}")
def predict_battery(vehicle_id: str):
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT battery_percent FROM ev_telemetry WHERE vehicle_id=%s ORDER BY timestamp DESC LIMIT 20",
            (vehicle_id,)
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        if len(rows) < 3:
            return success({"vehicle_id": vehicle_id, "predicted_battery": None, "note": "Insufficient data"})
        values = np.array([r[0] for r in rows])
        x = np.arange(len(values))
        coeffs = np.polyfit(x, values[::-1], 1)
        next_val = float(np.clip(np.polyval(coeffs, len(values)), 0, 100))
        ma = float(np.mean(values[:5]))
        return success({
            "vehicle_id": vehicle_id,
            "predicted_battery_regression": round(next_val, 2),
            "moving_average_5": round(ma, 2),
            "data_points": len(values)
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/fleet/analytics")
def fleet_analytics():
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT AVG(battery_percent), AVG(temperature), COUNT(DISTINCT vehicle_id)
            FROM (
                SELECT DISTINCT ON (vehicle_id) vehicle_id, battery_percent, temperature
                FROM ev_telemetry ORDER BY vehicle_id, timestamp DESC
            ) latest
        """)
        row = cur.fetchone()
        cur.close(); conn.close()
        return success({
            "avg_battery": round(float(row[0] or 0), 2),
            "avg_temperature": round(float(row[1] or 0), 2),
            "active_vehicles": int(row[2] or 0)
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/fleet/delivery_plan")
def delivery_plan():
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT DISTINCT ON (vehicle_id) vehicle_id, battery_percent, lat, lon
            FROM ev_telemetry ORDER BY vehicle_id, timestamp DESC
        """)
        vehicles = cur.fetchall()
        cur.execute("SELECT vehicle_id, destination FROM deliveries")
        deliveries = {r[0]: r[1] for r in cur.fetchall()}
        stations = get_stations(cur)
        cur.close(); conn.close()
        plan = []
        for vid, batt, lat, lon in vehicles:
            dest = deliveries.get(vid, "Unassigned")
            charging_stop = None
            if batt < 30:
                name, dist = find_nearest_station(lat, lon, stations)
                charging_stop = f"{name} ({round(dist,1)} km)"
            plan.append({
                "vehicle_id": vid,
                "battery_percent": round(batt, 1),
                "destination": dest,
                "charging_stop": charging_stop
            })
        return success(plan)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/fleet/route_optimization")
def route_optimization():
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT DISTINCT ON (vehicle_id) vehicle_id, battery_percent, lat, lon
            FROM ev_telemetry ORDER BY vehicle_id, timestamp DESC
        """)
        vehicles = cur.fetchall()
        stations = get_stations(cur)
        cur.close(); conn.close()
        result = []
        for vid, batt, lat, lon in vehicles:
            if batt < 40:
                name, dist = find_nearest_station(lat, lon, stations)
                result.append({
                    "vehicle_id": vid,
                    "battery_percent": round(batt, 1),
                    "recommended_station": name,
                    "distance_km": round(dist, 2)
                })
        return success(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok"}

# ── NEW ENDPOINTS ──────────────────────────────────────────────────────────────

@app.get("/fleet/alerts")
def fleet_alerts():
    """Return active alerts: critical battery, overheating, offline vehicles."""
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT DISTINCT ON (vehicle_id)
                vehicle_id, battery_percent, temperature, timestamp
            FROM ev_telemetry
            ORDER BY vehicle_id, timestamp DESC
        """)
        vehicles = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()

        alerts = []
        now = datetime.utcnow()
        for v in vehicles:
            ts = v["timestamp"]
            if ts and ts.tzinfo:
                from datetime import timezone
                age_s = (datetime.now(timezone.utc) - ts).total_seconds()
            else:
                age_s = (now - ts).total_seconds() if ts else 999

            if v["battery_percent"] < 10:
                alerts.append({"vehicle_id": v["vehicle_id"], "level": "critical",
                                "type": "battery", "message": f"Battery critically low: {v['battery_percent']:.1f}%"})
            elif v["battery_percent"] < 25:
                alerts.append({"vehicle_id": v["vehicle_id"], "level": "warning",
                                "type": "battery", "message": f"Low battery: {v['battery_percent']:.1f}%"})

            if v["temperature"] > 38:
                alerts.append({"vehicle_id": v["vehicle_id"], "level": "critical",
                                "type": "temperature", "message": f"Overheating: {v['temperature']:.1f}°C"})
            elif v["temperature"] > 33:
                alerts.append({"vehicle_id": v["vehicle_id"], "level": "warning",
                                "type": "temperature", "message": f"High temp: {v['temperature']:.1f}°C"})

            if age_s > 60:
                alerts.append({"vehicle_id": v["vehicle_id"], "level": "warning",
                                "type": "offline", "message": f"No signal for {int(age_s)}s"})

        return success(alerts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/fleet/summary")
def fleet_summary():
    """Extended fleet summary with per-vehicle stats."""
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT
                vehicle_id,
                COUNT(*) AS readings,
                AVG(battery_percent) AS avg_battery,
                MIN(battery_percent) AS min_battery,
                MAX(battery_percent) AS max_battery,
                AVG(temperature) AS avg_temp,
                MAX(temperature) AS max_temp,
                MAX(timestamp) AS last_seen
            FROM ev_telemetry
            GROUP BY vehicle_id
            ORDER BY vehicle_id
        """)
        rows = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        for r in rows:
            r["last_seen"] = r["last_seen"].isoformat() if r["last_seen"] else None
            r["avg_battery"] = round(float(r["avg_battery"] or 0), 2)
            r["min_battery"] = round(float(r["min_battery"] or 0), 2)
            r["max_battery"] = round(float(r["max_battery"] or 0), 2)
            r["avg_temp"] = round(float(r["avg_temp"] or 0), 2)
            r["max_temp"] = round(float(r["max_temp"] or 0), 2)
        return success(rows)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/vehicles/predict_series/{vehicle_id}")
def predict_series(vehicle_id: str, steps: int = 10):
    """Return a predicted battery drain series using linear regression (NumPy)."""
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT battery_percent, timestamp FROM ev_telemetry WHERE vehicle_id=%s ORDER BY timestamp ASC LIMIT 40",
            (vehicle_id,)
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        if len(rows) < 3:
            return success({"vehicle_id": vehicle_id, "series": [], "note": "Insufficient data"})

        values = np.array([r[0] for r in rows])
        x = np.arange(len(values))
        coeffs = np.polyfit(x, values, 1)

        future_x = np.arange(len(values), len(values) + steps)
        predicted = np.clip(np.polyval(coeffs, future_x), 0, 100).tolist()

        # Build timestamps (assume ~5s interval)
        last_ts = rows[-1][1]
        future_ts = []
        for i in range(1, steps + 1):
            from datetime import timedelta
            future_ts.append((last_ts + timedelta(seconds=5 * i)).isoformat())

        return success({
            "vehicle_id": vehicle_id,
            "slope": round(float(coeffs[0]), 4),
            "trend": "charging" if coeffs[0] > 0.2 else "stable" if abs(coeffs[0]) <= 0.2 else "draining",
            "historical": values.tolist(),
            "predicted": [round(v, 2) for v in predicted],
            "predicted_timestamps": future_ts
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/fleet/map_data")
def map_data():
    """Return current vehicle positions + station positions for map rendering."""
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT DISTINCT ON (vehicle_id) vehicle_id, battery_percent, temperature, lat, lon, timestamp
            FROM ev_telemetry ORDER BY vehicle_id, timestamp DESC
        """)
        vehicles = [dict(r) for r in cur.fetchall()]
        cur.execute("SELECT name, lat, lon FROM charging_stations")
        stations = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        for v in vehicles:
            v["timestamp"] = v["timestamp"].isoformat() if v["timestamp"] else None
        return success({"vehicles": vehicles, "stations": stations})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
