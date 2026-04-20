from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
import psycopg2, psycopg2.extras
import numpy as np
import os, math, uuid
from datetime import datetime, timedelta, timezone

app = FastAPI(title="SmartFleet TN")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

DB_URL = os.environ.get("DATABASE_URL", "postgresql://evfleet:evfleet@db:5432/evfleet")
IST    = timezone(timedelta(hours=5, minutes=30))

def get_conn():  return psycopg2.connect(DB_URL)
def ok(d):       return {"status": "success", "data": d}
def now_ist():   return datetime.now(IST)

def to_ist(dt):
    if dt is None: return None
    if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST).isoformat()

# ── MODELS ────────────────────────────────────────────────────────
class Telem(BaseModel):
    vehicle_id:      str
    battery_percent: float
    temperature:     float
    lat:             float
    lon:             float

    @validator("battery_percent")
    def chk_bat(cls, v):
        if not (0 <= v <= 100): raise ValueError("battery_percent must be 0-100")
        return round(float(v), 4)

    @validator("temperature")
    def chk_tmp(cls, v):
        if not (-50 <= v <= 100): raise ValueError("temperature out of range")
        return round(float(v), 4)

    @validator("lat")
    def chk_lat(cls, v):
        return round(float(v), 6)

    @validator("lon")
    def chk_lon(cls, v):
        return round(float(v), 6)

class OrderIn(BaseModel):
    customer_name: str
    pickup_area:   str
    delivery_area: str
    city:          str
    lat:           float
    lon:           float
    priority:      str = "normal"

# ── MATH ─────────────────────────────────────────────────────────
def hav(a1, o1, a2, o2):
    R = 6371
    p1, p2 = math.radians(a1), math.radians(a2)
    da = math.radians(a2 - a1)
    do = math.radians(o2 - o1)
    x = math.sin(da/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(do/2)**2
    return R * 2 * math.atan2(math.sqrt(x), math.sqrt(1 - x))

def nearest_st(lat, lon, stations):
    best, bd = None, float("inf")
    for nm, slat, slon in stations:
        d = hav(lat, lon, slat, slon)
        if d < bd:
            bd, best = d, nm
    return best, bd

def get_stations(cur, city=None):
    if city:
        cur.execute("SELECT name,lat,lon FROM charging_stations WHERE city=%s", (city,))
    else:
        cur.execute("SELECT name,lat,lon FROM charging_stations")
    return cur.fetchall()

# ── SCORING ENGINE ────────────────────────────────────────────────
def score_vehicle(v, olat, olon, loads):
    vid = v["vehicle_id"]
    bat = float(v["battery_percent"] or 0)
    tmp = float(v["temperature"]     or 30)
    vlt = float(v["lat"]             or 0)
    vln = float(v["lon"]             or 0)
    if bat < 10:               return None, f"bat_low({bat:.0f}%)"
    if tmp > 44:               return None, f"overheat({tmp:.1f})"
    if loads.get(vid, 0) >= 3: return None, "max_load"
    dist = hav(vlt, vln, olat, olon)
    sc = dist
    if   bat < 20: sc += 40
    elif bat < 35: sc += 20
    elif bat < 50: sc += 8
    elif bat < 65: sc += 3
    if   tmp > 40: sc += 12
    elif tmp > 37: sc += 5
    sc += loads.get(vid, 0) * 15
    return sc, f"dist={dist:.1f}km bat={bat:.0f}% load={loads.get(vid,0)}"

def find_best(olat, olon, ocity):
    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT vehicle_id,COUNT(*) cnt FROM deliveries WHERE status='in_progress' GROUP BY vehicle_id")
        loads = {r["vehicle_id"]: int(r["cnt"]) for r in cur.fetchall()}
        cur.execute("""
            SELECT DISTINCT ON(t.vehicle_id)
                t.vehicle_id, t.battery_percent, t.temperature, t.lat, t.lon, v.city
            FROM ev_telemetry t
            JOIN vehicles v ON v.vehicle_id = t.vehicle_id
            ORDER BY t.vehicle_id, t.timestamp DESC
        """)
        all_v = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        for pool in [[v for v in all_v if v["city"] == ocity], all_v]:
            best, bs, br = None, float("inf"), ""
            for v in pool:
                s, r = score_vehicle(v, olat, olon, loads)
                if s is not None and s < bs:
                    bs, best, br = s, v, r
            if best:
                return best, br
        return None, "no_eligible_vehicle"
    except Exception as e:
        try: conn.close()
        except: pass
        return None, f"error:{e}"

# ── TELEMETRY ─────────────────────────────────────────────────────
@app.post("/vehicles/update")
def update_vehicle(d: Telem):
    """
    Uses named parameters %(name)s to guarantee column-value
    mapping regardless of table column order in the database.
    """
    try:
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("""
            INSERT INTO ev_telemetry
                (vehicle_id, battery_percent, temperature, lat, lon, timestamp)
            VALUES
                (%(vehicle_id)s, %(battery_percent)s, %(temperature)s,
                 %(lat)s, %(lon)s, %(ts)s)
        """, {
            "vehicle_id":      d.vehicle_id,
            "battery_percent": d.battery_percent,
            "temperature":     d.temperature,
            "lat":             d.lat,
            "lon":             d.lon,
            "ts":              now_ist(),
        })
        conn.commit()
        cur.close(); conn.close()
        return ok("ok")
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/vehicles/status")
def vehicle_status():
    try:
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT DISTINCT ON(t.vehicle_id)
                t.vehicle_id, t.battery_percent, t.temperature,
                t.lat, t.lon, t.timestamp,
                v.name, v.city, v.status
            FROM ev_telemetry t
            LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
            ORDER BY t.vehicle_id, t.timestamp DESC
        """)
        rows = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        for r in rows:
            r["timestamp"] = to_ist(r["timestamp"])
        return ok(rows)
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/vehicles/history/{vid}")
def vehicle_history(vid: str):
    try:
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT battery_percent, temperature, timestamp
            FROM ev_telemetry
            WHERE vehicle_id = %s
            ORDER BY timestamp DESC
            LIMIT 60
        """, (vid,))
        rows = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        for r in rows:
            r["timestamp"] = to_ist(r["timestamp"])
        return ok(rows)
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/vehicles/nearest_station/{vid}")
def vehicle_nearest(vid: str):
    try:
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("""
            SELECT lat, lon FROM ev_telemetry
            WHERE vehicle_id = %s
            ORDER BY timestamp DESC LIMIT 1
        """, (vid,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "vehicle not found")
        name, dist = nearest_st(row[0], row[1], get_stations(cur))
        cur.close(); conn.close()
        return ok({"vehicle_id": vid, "nearest_station": name, "distance_km": round(dist, 2)})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/vehicles/predict_series/{vid}")
def predict_series(vid: str, steps: int = 10):
    try:
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("""
            SELECT battery_percent, timestamp
            FROM ev_telemetry
            WHERE vehicle_id = %s
            ORDER BY timestamp ASC
            LIMIT 40
        """, (vid,))
        rows = cur.fetchall()
        cur.close(); conn.close()

        if len(rows) == 0:
            return ok({
                "vehicle_id": vid, "note": "no_data",
                "historical": [], "predicted": [],
                "predicted_timestamps": [], "slope": 0.0,
                "trend": "unknown", "readings": 0
            })

        vals    = np.array([float(r[0]) for r in rows])
        last_ts = rows[-1][1]
        fut_ts  = [to_ist(last_ts + timedelta(seconds=5*i)) for i in range(1, steps+1)]

        if len(rows) < 2:
            flat = float(vals[0])
            return ok({
                "vehicle_id": vid, "note": "collecting",
                "slope": 0.0, "trend": "stable",
                "historical": vals.tolist(),
                "predicted": [round(flat, 2)] * steps,
                "predicted_timestamps": fut_ts,
                "readings": len(rows)
            })

        coeffs = np.polyfit(np.arange(len(vals)), vals, 1)
        pred   = np.clip(
            np.polyval(coeffs, np.arange(len(vals), len(vals)+steps)),
            0, 100
        ).tolist()

        if   coeffs[0] >  0.2: trend = "charging"
        elif coeffs[0] < -0.2: trend = "draining"
        else:                   trend = "stable"

        return ok({
            "vehicle_id":  vid,
            "slope":       round(float(coeffs[0]), 4),
            "trend":       trend,
            "historical":  vals.tolist(),
            "predicted":   [round(v, 2) for v in pred],
            "predicted_timestamps": fut_ts,
            "readings":    len(rows)
        })
    except Exception as e:
        raise HTTPException(500, str(e))

# ── FLEET ─────────────────────────────────────────────────────────
@app.get("/fleet/analytics")
def fleet_analytics():
    try:
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT
                ROUND(AVG(battery_percent)::numeric, 2) ab,
                ROUND(AVG(temperature)::numeric, 2)     at2,
                COUNT(DISTINCT vehicle_id)              cnt
            FROM (
                SELECT DISTINCT ON(vehicle_id)
                    vehicle_id, battery_percent, temperature
                FROM ev_telemetry
                ORDER BY vehicle_id, timestamp DESC
            ) x
        """)
        row = dict(cur.fetchone())
        cur.execute("""
            SELECT v.city,
                   COUNT(DISTINCT v.vehicle_id) veh,
                   ROUND(AVG(sub.battery_percent)::numeric, 1) ab
            FROM vehicles v
            LEFT JOIN LATERAL (
                SELECT battery_percent FROM ev_telemetry
                WHERE vehicle_id = v.vehicle_id
                ORDER BY timestamp DESC LIMIT 1
            ) sub ON true
            GROUP BY v.city ORDER BY v.city
        """)
        cities = [dict(r) for r in cur.fetchall()]
        cur.execute("""
            SELECT
                COUNT(*) FILTER(WHERE status='pending')     pending,
                COUNT(*) FILTER(WHERE status='assigned')    assigned,
                COUNT(*) FILTER(WHERE status='in_progress') in_progress,
                COUNT(*) FILTER(WHERE status='delivered')   delivered,
                COUNT(*) total
            FROM orders
        """)
        os_ = dict(cur.fetchone())
        cur.close(); conn.close()
        return ok({
            "avg_battery":     float(row["ab"]  or 0),
            "avg_temperature": float(row["at2"] or 0),
            "active_vehicles": int(row["cnt"]   or 0),
            "total_vehicles":  30,
            "city_breakdown":  [
                {"city": c["city"], "vehicles": int(c["veh"] or 0),
                 "avg_battery": float(c["ab"] or 0)}
                for c in cities
            ],
            "orders": {k: int(os_[k] or 0) for k in os_}
        })
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/fleet/map_data")
def map_data():
    try:
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT DISTINCT ON(t.vehicle_id)
                t.vehicle_id, t.battery_percent, t.temperature,
                t.lat, t.lon, t.timestamp,
                v.name, v.city, v.status
            FROM ev_telemetry t
            LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
            ORDER BY t.vehicle_id, t.timestamp DESC
        """)
        vehicles = [dict(r) for r in cur.fetchall()]
        for v in vehicles:
            v["lat"]       = float(v["lat"] or 0)
            v["lon"]       = float(v["lon"] or 0)
            v["timestamp"] = to_ist(v["timestamp"])

        cur.execute("SELECT name,city,lat,lon FROM charging_stations")
        stations = [
            {"name": r["name"], "city": r["city"],
             "lat": float(r["lat"]), "lon": float(r["lon"])}
            for r in cur.fetchall()
        ]

        cur.execute("""
            SELECT d.vehicle_id, d.order_id, d.destination, d.city,
                   o.lat delivery_lat, o.lon delivery_lon,
                   o.priority, o.customer_name, o.delivery_area
            FROM deliveries d
            JOIN orders o ON o.order_id = d.order_id
            WHERE d.status = 'in_progress'
        """)
        deliveries = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()

        vpos   = {v["vehicle_id"]: v for v in vehicles}
        routes = []
        for d in deliveries:
            vp   = vpos.get(d["vehicle_id"])
            dlat = float(d["delivery_lat"] or 0)
            dlon = float(d["delivery_lon"] or 0)
            if vp and dlat and dlon:
                dist = hav(vp["lat"], vp["lon"], dlat, dlon)
                eta  = max(1, round(dist / 25 * 60))
                routes.append({
                    "vehicle_id":    d["vehicle_id"],
                    "order_id":      d["order_id"],
                    "from_lat":      vp["lat"], "from_lon": vp["lon"],
                    "to_lat":        dlat,      "to_lon":   dlon,
                    "delivery_area": d["delivery_area"],
                    "customer_name": d["customer_name"],
                    "priority":      d["priority"],
                    "distance_km":   round(dist, 2),
                    "eta_minutes":   eta,
                    "city":          d["city"]
                })
        return ok({"vehicles": vehicles, "stations": stations,
                   "routes": routes, "active_deliveries": deliveries})
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/fleet/active_routes")
def active_routes():
    try:
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT d.vehicle_id, d.order_id, d.city,
                   o.delivery_area, o.lat delivery_lat, o.lon delivery_lon, o.priority,
                   t.lat vehicle_lat, t.lon vehicle_lon, t.battery_percent
            FROM deliveries d
            JOIN orders o ON o.order_id = d.order_id
            LEFT JOIN LATERAL (
                SELECT lat, lon, battery_percent FROM ev_telemetry
                WHERE vehicle_id = d.vehicle_id
                ORDER BY timestamp DESC LIMIT 1
            ) t ON true
            WHERE d.status = 'in_progress'
            ORDER BY d.vehicle_id
        """)
        rows   = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        result = {}
        for r in rows:
            vid = r["vehicle_id"]
            if vid not in result:
                result[vid] = {
                    "order_id":      r["order_id"],
                    "delivery_area": r["delivery_area"],
                    "dlat":          float(r["delivery_lat"]    or 0),
                    "dlon":          float(r["delivery_lon"]    or 0),
                    "priority":      r["priority"],
                    "city":          r["city"],
                    "vehicle_lat":   float(r["vehicle_lat"]     or 0),
                    "vehicle_lon":   float(r["vehicle_lon"]     or 0),
                    "battery":       float(r["battery_percent"] or 0),
                }
        return ok(result)
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/fleet/alerts")
def fleet_alerts():
    try:
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT DISTINCT ON(t.vehicle_id)
                t.vehicle_id, t.battery_percent, t.temperature,
                t.timestamp, v.city, v.name
            FROM ev_telemetry t
            LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
            ORDER BY t.vehicle_id, t.timestamp DESC
        """)
        rows   = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        alerts = []
        now    = datetime.now(IST)
        for v in rows:
            ts = v["timestamp"]
            if ts and ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc).astimezone(IST)
            age  = (now - ts).total_seconds() if ts else 9999
            b    = float(v["battery_percent"] or 0)
            t    = float(v["temperature"]     or 0)
            vid  = v["vehicle_id"]
            city = v.get("city", "")
            if   b < 10: alerts.append({"vehicle_id": vid, "city": city, "level": "critical", "type": "battery",     "message": f"Battery critically low: {b:.1f}%"})
            elif b < 25: alerts.append({"vehicle_id": vid, "city": city, "level": "warning",  "type": "battery",     "message": f"Low battery: {b:.1f}%"})
            if   t > 40: alerts.append({"vehicle_id": vid, "city": city, "level": "critical", "type": "temperature", "message": f"Overheating: {t:.1f}°C"})
            elif t > 36: alerts.append({"vehicle_id": vid, "city": city, "level": "warning",  "type": "temperature", "message": f"High temp: {t:.1f}°C"})
            if age > 90: alerts.append({"vehicle_id": vid, "city": city, "level": "warning",  "type": "offline",     "message": f"No signal for {int(age)}s"})
        return ok(alerts)
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/fleet/summary")
def fleet_summary():
    try:
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT t.vehicle_id, v.name, v.city, v.status,
                   COUNT(*)               readings,
                   AVG(t.battery_percent) ab,
                   MIN(t.battery_percent) mn,
                   MAX(t.battery_percent) mx,
                   AVG(t.temperature)     at2,
                   MAX(t.temperature)     mt,
                   MAX(t.timestamp)       ls
            FROM ev_telemetry t
            LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
            GROUP BY t.vehicle_id, v.name, v.city, v.status
            ORDER BY v.city, t.vehicle_id
        """)
        rows = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        for r in rows:
            r["last_seen"]   = to_ist(r.pop("ls",  None))
            r["avg_battery"] = round(float(r.pop("ab",  None) or 0), 2)
            r["min_battery"] = round(float(r.pop("mn",  None) or 0), 2)
            r["max_battery"] = round(float(r.pop("mx",  None) or 0), 2)
            r["avg_temp"]    = round(float(r.pop("at2", None) or 0), 2)
            r["max_temp"]    = round(float(r.pop("mt",  None) or 0), 2)
        return ok(rows)
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/fleet/route_optimization")
def route_opt():
    try:
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute("""
            SELECT DISTINCT ON(vehicle_id)
                vehicle_id, battery_percent, lat, lon
            FROM ev_telemetry
            ORDER BY vehicle_id, timestamp DESC
        """)
        vehicles = cur.fetchall()
        stations = get_stations(cur)
        cur.close(); conn.close()
        result = []
        for vid, bat, lat, lon in vehicles:
            if float(bat or 0) < 40:
                name, dist = nearest_st(float(lat), float(lon), stations)
                result.append({
                    "vehicle_id":          vid,
                    "battery_percent":     round(float(bat), 1),
                    "recommended_station": name,
                    "distance_km":         round(dist, 2)
                })
        return ok(result)
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/fleet/delivery_plan")
def delivery_plan():
    try:
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT DISTINCT ON(t.vehicle_id)
                t.vehicle_id, t.battery_percent, t.lat, t.lon, v.city
            FROM ev_telemetry t
            LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
            ORDER BY t.vehicle_id, t.timestamp DESC
        """)
        vehicles = cur.fetchall()
        cur.execute("SELECT vehicle_id,destination FROM deliveries WHERE status='in_progress'")
        dm = {}
        for d in cur.fetchall():
            dm.setdefault(d["vehicle_id"], []).append(d["destination"])
        stations = get_stations(cur)
        cur.close(); conn.close()
        plan = []
        for v in vehicles:
            bat   = float(v["battery_percent"] or 0)
            lat   = float(v["lat"] or 0)
            lon   = float(v["lon"] or 0)
            dests = dm.get(v["vehicle_id"], [])
            cs    = None
            if bat < 30:
                name, dist = nearest_st(lat, lon, stations)
                cs = f"{name} ({round(dist,1)} km)"
            plan.append({
                "vehicle_id":        v["vehicle_id"],
                "city":              v.get("city", ""),
                "battery_percent":   round(bat, 1),
                "destinations":      dests,
                "destination":       dests[0] if dests else "Standby",
                "active_deliveries": len(dests),
                "charging_stop":     cs
            })
        return ok(plan)
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/fleet/dispatch_board")
def dispatch_board():
    try:
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT d.vehicle_id, d.order_id, d.destination, d.city, d.assigned_at,
                   o.customer_name, o.pickup_area, o.delivery_area,
                   o.lat delivery_lat, o.lon delivery_lon,
                   o.priority, o.estimated_distance_km,
                   t.battery_percent, t.temperature,
                   t.lat vehicle_lat, t.lon vehicle_lon,
                   v.name vehicle_name, v.city vehicle_city
            FROM deliveries d
            JOIN orders   o ON o.order_id   = d.order_id
            JOIN vehicles v ON v.vehicle_id = d.vehicle_id
            LEFT JOIN LATERAL (
                SELECT battery_percent, temperature, lat, lon
                FROM ev_telemetry
                WHERE vehicle_id = d.vehicle_id
                ORDER BY timestamp DESC LIMIT 1
            ) t ON true
            WHERE d.status = 'in_progress'
            ORDER BY CASE o.priority WHEN 'urgent' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
                     d.assigned_at
        """)
        rows  = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        board = []
        for r in rows:
            vlat   = float(r["vehicle_lat"]  or 0)
            vlon   = float(r["vehicle_lon"]  or 0)
            dlat   = float(r["delivery_lat"] or 0)
            dlon   = float(r["delivery_lon"] or 0)
            dist   = hav(vlat, vlon, dlat, dlon) if vlat and vlon else float(r["estimated_distance_km"] or 0)
            eta    = max(1, round(dist / 25 * 60))
            bat    = float(r["battery_percent"] or 0)
            bat_ok = bat > dist * 0.5 + 10
            cs     = None
            if not bat_ok and vlat:
                conn2 = get_conn(); cur2 = conn2.cursor()
                name, sd = nearest_st(vlat, vlon, get_stations(cur2))
                cs = f"{name} ({round(sd,1)} km)"
                cur2.close(); conn2.close()
            board.append({
                "vehicle_id":      r["vehicle_id"],
                "vehicle_name":    r["vehicle_name"],
                "vehicle_city":    r["vehicle_city"],
                "vehicle_lat":     vlat,
                "vehicle_lon":     vlon,
                "battery_percent": round(bat, 1),
                "temperature":     round(float(r["temperature"] or 0), 1),
                "order_id":        r["order_id"],
                "customer_name":   r["customer_name"],
                "pickup_area":     r["pickup_area"],
                "delivery_area":   r["delivery_area"],
                "delivery_lat":    dlat,
                "delivery_lon":    dlon,
                "city":            r["city"],
                "priority":        r["priority"],
                "distance_km":     round(dist, 2),
                "eta_minutes":     eta,
                "battery_ok":      bat_ok,
                "charging_needed": cs,
                "assigned_at":     to_ist(r["assigned_at"])
            })
        return ok(board)
    except Exception as e:
        raise HTTPException(500, str(e))

# ── ORDERS ────────────────────────────────────────────────────────
@app.get("/orders/list")
def list_orders(status: str = None, city: str = None, limit: int = 100):
    try:
        conn   = get_conn()
        cur    = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        q      = "SELECT * FROM orders WHERE 1=1"
        params = []
        if status: q += " AND status=%s";  params.append(status)
        if city:   q += " AND city=%s";    params.append(city)
        q += " ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, created_at DESC LIMIT %s"
        params.append(limit)
        cur.execute(q, params)
        rows = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        for r in rows:
            r["created_at"] = to_ist(r["created_at"])
        return ok(rows)
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/orders/place")
def place_order(o: OrderIn):
    try:
        conn = get_conn(); cur = conn.cursor()
        oid  = f"ORD-{o.city[:3].upper()}-{str(uuid.uuid4())[:6].upper()}"
        cur.execute("""
            INSERT INTO orders
                (order_id, customer_name, pickup_area, delivery_area,
                 city, lat, lon, priority, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (oid, o.customer_name, o.pickup_area, o.delivery_area,
              o.city, o.lat, o.lon, o.priority, now_ist()))
        conn.commit(); cur.close(); conn.close()
        return ok({"order_id": oid})
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/orders/auto_assign")
def auto_assign():
    try:
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT * FROM orders
            WHERE status = 'pending'
            ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, created_at
            LIMIT 30
        """)
        pending = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        if not pending:
            return ok({"assigned": 0, "message": "No pending orders"})
        assigned = 0
        results  = []
        for order in pending:
            best, reason = find_best(float(order["lat"]), float(order["lon"]), order["city"])
            if not best:
                results.append({"order_id": order["order_id"], "status": "unassigned", "reason": reason})
                continue
            vid  = best["vehicle_id"]
            dist = hav(float(best["lat"]), float(best["lon"]),
                       float(order["lat"]), float(order["lon"]))
            conn2 = get_conn()
            try:
                cur2 = conn2.cursor()
                cur2.execute("""
                    UPDATE orders
                    SET status='assigned', assigned_vehicle=%s, estimated_distance_km=%s
                    WHERE order_id=%s
                """, (vid, round(dist, 2), order["order_id"]))
                cur2.execute("""
                    INSERT INTO deliveries
                        (vehicle_id, order_id, destination, city, status, assigned_at)
                    VALUES (%s,%s,%s,%s,'in_progress',%s)
                    ON CONFLICT DO NOTHING
                """, (vid, order["order_id"], order["delivery_area"], order["city"], now_ist()))
                cur2.execute("UPDATE vehicles SET status='on_delivery' WHERE vehicle_id=%s", (vid,))
                conn2.commit(); cur2.close()
            finally:
                conn2.close()
            assigned += 1
            results.append({
                "order_id":      order["order_id"],
                "assigned_to":   vid,
                "city":          order["city"],
                "delivery_area": order["delivery_area"],
                "distance_km":   round(dist, 2),
                "battery":       round(float(best["battery_percent"]), 1),
                "priority":      order["priority"],
                "reason":        reason
            })
        return ok({"assigned": assigned, "total_pending": len(pending), "results": results})
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/orders/{order_id}/complete")
def complete_order(order_id: str):
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("SELECT assigned_vehicle,city FROM orders WHERE order_id=%s", (order_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "order not found")
        vid, city = row[0], row[1]
        ts = now_ist()
        cur.execute("UPDATE orders SET status='delivered', delivered_at=%s WHERE order_id=%s", (ts, order_id))
        cur.execute("UPDATE deliveries SET status='completed', completed_at=%s WHERE order_id=%s", (ts, order_id))
        cur.execute("SELECT COUNT(*) FROM deliveries WHERE vehicle_id=%s AND status='in_progress'", (vid,))
        remaining = cur.fetchone()[0]
        if remaining == 0 and vid:
            cur.execute("UPDATE vehicles SET status='available' WHERE vehicle_id=%s", (vid,))
        conn.commit(); cur.close(); conn.close()
        return ok({
            "order_id":      order_id,
            "status":        "delivered",
            "vehicle_id":    vid,
            "city":          city,
            "delivered_at":  to_ist(ts),
            "vehicle_freed": remaining == 0
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/orders/recent_deliveries")
def recent_deliveries(limit: int = 20):
    try:
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT o.order_id, o.customer_name, o.delivery_area, o.city,
                   o.priority, o.assigned_vehicle, o.estimated_distance_km,
                   o.delivered_at, o.created_at, d.completed_at, d.vehicle_id
            FROM orders o
            LEFT JOIN deliveries d ON d.order_id = o.order_id AND d.status = 'completed'
            WHERE o.status = 'delivered'
            ORDER BY o.delivered_at DESC NULLS LAST
            LIMIT %s
        """, (limit,))
        rows = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        for r in rows:
            r["delivered_at"] = to_ist(r["delivered_at"])
            r["created_at"]   = to_ist(r["created_at"])
            r["completed_at"] = to_ist(r["completed_at"])
        return ok(rows)
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/orders/stats")
def order_stats():
    try:
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT city,
                COUNT(*) FILTER(WHERE status='pending')     pending,
                COUNT(*) FILTER(WHERE status='assigned')    assigned,
                COUNT(*) FILTER(WHERE status='in_progress') in_progress,
                COUNT(*) FILTER(WHERE status='delivered')   delivered,
                COUNT(*) FILTER(WHERE priority='urgent')    urgent_total,
                COUNT(*) total
            FROM orders
            GROUP BY city ORDER BY city
        """)
        rows = [dict(r) for r in cur.fetchall()]
        cur.execute("SELECT COUNT(*) c FROM orders WHERE status='pending' AND priority='urgent'")
        up = int(cur.fetchone()["c"])
        cur.close(); conn.close()
        return ok({"by_city": rows, "urgent_pending": up})
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/health")
def health():
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM ev_telemetry")
        tr = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM orders WHERE status='pending'")
        po = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM deliveries WHERE status='in_progress'")
        ad = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM orders WHERE status='delivered'")
        dv = cur.fetchone()[0]
        cur.close(); conn.close()
        return {
            "status":            "ok",
            "telemetry":         tr,
            "pending_orders":    po,
            "active_deliveries": ad,
            "delivered":         dv,
            "time_ist":          now_ist().strftime("%Y-%m-%d %H:%M:%S IST")
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}
