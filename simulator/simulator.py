"""
SmartFleet Tamil Nadu — Simulator v6  (visible pending orders)
==============================================================
KEY CHANGE FROM v5:
  - Every time a vehicle completes a delivery, 1 NEW order is placed immediately
  - Auto-assign runs every 20 cycles (~100 seconds) instead of every 4
  - This means new orders sit as PENDING for ~100 seconds before being dispatched
  - You can watch the Pending Orders counter rise on the Overview tab
  - Then watch it drain to 0 when auto-assign fires
  - The cycle repeats continuously — always something happening on the map
"""

import time, random, requests, os, math, uuid

API = os.getenv("API_URL", "http://backend:8000")

CITY_HUBS = {
    "Chennai":     (13.0827, 80.2707),
    "Coimbatore":  (11.0168, 76.9558),
    "Madurai":     ( 9.9312, 78.1198),
    "Salem":       (11.6643, 78.1460),
    "Trichy":      (10.8631, 78.6927),
    "Tirunelveli": ( 8.7139, 77.7567),
}

VEHICLES = {
    "TN01EV001":{"bat":88.0,"tmp":32.5,"lat":13.0827,"lon":80.2707,"chg":False,"city":"Chennai"},
    "TN01EV002":{"bat":74.0,"tmp":33.2,"lat":13.0418,"lon":80.2341,"chg":False,"city":"Chennai"},
    "TN01EV003":{"bat":65.0,"tmp":34.0,"lat":13.0850,"lon":80.2101,"chg":False,"city":"Chennai"},
    "TN01EV004":{"bat":82.0,"tmp":33.5,"lat":13.0067,"lon":80.2206,"chg":False,"city":"Chennai"},
    "TN01EV005":{"bat":91.0,"tmp":32.0,"lat":12.9279,"lon":80.2279,"chg":False,"city":"Chennai"},
    "TN01EV006":{"bat":70.0,"tmp":35.1,"lat":13.0012,"lon":80.2565,"chg":False,"city":"Chennai"},
    "TN01EV007":{"bat":55.0,"tmp":33.8,"lat":12.9816,"lon":80.2209,"chg":False,"city":"Chennai"},
    "TN01EV008":{"bat":78.0,"tmp":34.5,"lat":12.9249,"lon":80.1000,"chg":False,"city":"Chennai"},
    "TN01EV009":{"bat":79.0,"tmp":32.8,"lat":13.0358,"lon":80.1568,"chg":False,"city":"Chennai"},
    "TN01EV010":{"bat":63.0,"tmp":33.2,"lat":13.1181,"lon":80.2353,"chg":False,"city":"Chennai"},
    "TN09EV001":{"bat":82.0,"tmp":31.5,"lat":11.0050,"lon":76.9629,"chg":False,"city":"Coimbatore"},
    "TN09EV002":{"bat":67.0,"tmp":32.1,"lat":11.0168,"lon":76.9558,"chg":False,"city":"Coimbatore"},
    "TN09EV003":{"bat":75.0,"tmp":33.0,"lat":11.0232,"lon":77.0086,"chg":False,"city":"Coimbatore"},
    "TN09EV004":{"bat":93.0,"tmp":31.0,"lat":11.0230,"lon":76.9612,"chg":False,"city":"Coimbatore"},
    "TN09EV005":{"bat":60.0,"tmp":32.5,"lat":11.0019,"lon":77.0265,"chg":False,"city":"Coimbatore"},
    "TN50EV001":{"bat":76.0,"tmp":34.0,"lat": 9.9312,"lon":78.1198,"chg":False,"city":"Madurai"},
    "TN50EV002":{"bat":52.0,"tmp":34.8,"lat": 9.9195,"lon":78.1092,"chg":False,"city":"Madurai"},
    "TN50EV003":{"bat":88.0,"tmp":33.5,"lat": 9.9252,"lon":78.1198,"chg":False,"city":"Madurai"},
    "TN50EV004":{"bat":65.0,"tmp":34.0,"lat": 9.9567,"lon":78.0819,"chg":False,"city":"Madurai"},
    "TN50EV005":{"bat":61.0,"tmp":34.2,"lat": 9.8963,"lon":78.1219,"chg":False,"city":"Madurai"},
    "TN25EV001":{"bat":70.0,"tmp":32.0,"lat":11.6643,"lon":78.1460,"chg":False,"city":"Salem"},
    "TN25EV002":{"bat":84.0,"tmp":31.5,"lat":11.6680,"lon":78.1560,"chg":False,"city":"Salem"},
    "TN25EV003":{"bat":55.0,"tmp":32.8,"lat":11.6790,"lon":78.1420,"chg":False,"city":"Salem"},
    "TN25EV004":{"bat":57.0,"tmp":33.0,"lat":11.6530,"lon":78.1600,"chg":False,"city":"Salem"},
    "TN45EV001":{"bat":95.0,"tmp":31.0,"lat":10.8631,"lon":78.6927,"chg":False,"city":"Trichy"},
    "TN45EV002":{"bat":48.0,"tmp":34.1,"lat":10.8050,"lon":78.6856,"chg":False,"city":"Trichy"},
    "TN45EV003":{"bat":72.0,"tmp":32.5,"lat":10.7905,"lon":78.7047,"chg":False,"city":"Trichy"},
    "TN72EV001":{"bat":86.0,"tmp":33.0,"lat": 8.7139,"lon":77.7567,"chg":False,"city":"Tirunelveli"},
    "TN72EV002":{"bat":44.0,"tmp":35.0,"lat": 8.7273,"lon":77.7382,"chg":False,"city":"Tirunelveli"},
    "TN72EV003":{"bat":61.0,"tmp":34.0,"lat": 8.7480,"lon":77.6930,"chg":False,"city":"Tirunelveli"},
}

BOUNDS = {
    "Chennai":     ((12.85,13.20),(80.05,80.35)),
    "Coimbatore":  ((10.95,11.10),(76.90,77.10)),
    "Madurai":     (( 9.85,10.00),(78.05,78.20)),
    "Salem":       ((11.60,11.75),(78.10,78.25)),
    "Trichy":      ((10.75,10.90),(78.65,78.75)),
    "Tirunelveli": (( 8.68, 8.80),(77.65,77.80)),
}

# Pool of orders to draw from — one placed per delivery completed
# Each city has multiple options so orders feel varied
ORDER_POOL = {
    "Chennai": [
        ("Arjun Venkat",    "Chennai Central Hub", "Besant Nagar Beach Road",    13.0002, 80.2707, "urgent"),
        ("Bhavya Nair",     "Guindy Warehouse",    "Thiruvanmiyur Signal",        12.9829, 80.2580, "normal"),
        ("Chandru Raj",     "OMR Distribution",    "Porur Bypass Road",           13.0370, 80.1570, "normal"),
        ("Divya Menon",     "Tambaram Hub",        "Nanganallur Market",          12.9815, 80.1432, "urgent"),
        ("Elan Selvam",     "Anna Nagar Hub",      "Korattur Main Road",          13.1043, 80.1952, "low"),
        ("Fathima Begum",   "Chennai Central Hub", "Egmore Station Area",         13.0782, 80.2617, "urgent"),
        ("Gopal Iyer",      "Guindy Warehouse",    "St Thomas Mount",             12.9925, 80.1669, "normal"),
        ("Harini Lakshmi",  "OMR Distribution",    "Sholinganallur OMR",          12.8997, 80.2274, "normal"),
        ("Indira Raman",    "Tambaram Hub",        "Pallavaram Cross",            12.9720, 80.1510, "low"),
        ("Jagan Kumar",     "Anna Nagar Hub",      "Ambattur Estate",             13.0940, 80.1620, "urgent"),
        ("Kalpana Devi",    "Chennai Central Hub", "Adyar Depot",                 13.0010, 80.2570, "normal"),
        ("Lalitha Suresh",  "Guindy Warehouse",    "Chromepet Station",           12.9505, 80.1415, "normal"),
    ],
    "Coimbatore": [
        ("Manoj Nair",      "CBE Central Hub",     "Coimbatore Airport Area",     11.0305, 77.0437, "urgent"),
        ("Nithya Raj",      "Peelamedu Hub",       "Kavundampalayam Cross",       11.0512, 76.9905, "normal"),
        ("Om Prakash",      "CBE Central Hub",     "Vadavalli Junction",          10.9932, 76.9196, "normal"),
        ("Priya Selvam",    "Peelamedu Hub",       "Singanallur Lake Side",       11.0019, 77.0265, "urgent"),
        ("Rajan Kumar",     "CBE Central Hub",     "Saravanampatti IT Park",      11.0650, 77.0250, "low"),
        ("Sumathi Bai",     "Peelamedu Hub",       "Ganapathy Main Road",         11.0280, 76.9480, "normal"),
    ],
    "Madurai": [
        ("Tamil Arasan",    "MDU Central Hub",     "Thirumangalam Junction",       9.8723, 78.0797, "normal"),
        ("Uma Devi",        "Mattuthavani Hub",    "Goripalayam Overbridge",       9.9055, 78.1305, "urgent"),
        ("Velu Murugan",    "MDU Central Hub",     "Anaiyur Village Road",         9.9489, 78.0523, "low"),
        ("Wafa Begum",      "Mattuthavani Hub",    "Pasumalai Foothills",          9.8820, 78.0840, "normal"),
        ("Xavier Raj",      "MDU Central Hub",     "Arappalayam North",            9.9200, 78.1100, "urgent"),
    ],
    "Salem": [
        ("Yamuna Priya",    "Salem Hub",           "Attur Bus Stand",             11.5986, 78.6011, "normal"),
        ("Zubair Ahmed",    "Salem Hub",           "Yercaud Ghat Road",           11.7752, 78.2068, "normal"),
        ("Aarthi Selvi",    "Salem Hub",           "Hasthampatti Market",         11.6800, 78.1700, "urgent"),
        ("Balu Krishnan",   "Salem Hub",           "Ammapet Junction",            11.6432, 78.1532, "low"),
    ],
    "Trichy": [
        ("Chandra Sekar",   "Trichy Hub",          "Ariyamangalam Main",          10.8762, 78.7424, "urgent"),
        ("Deepika Raj",     "Trichy Hub",          "Manachanallur Road",          10.8099, 78.7897, "normal"),
        ("Ezhil Maran",     "Trichy Hub",          "Puthur Main Street",          10.8450, 78.7050, "normal"),
        ("Famitha Banu",    "Trichy Hub",          "Golden Rock Colony",          10.8350, 78.6750, "low"),
    ],
    "Tirunelveli": [
        ("Ganesh Raj",      "Tirunelveli Hub",     "Pettai Junction",              8.7005, 77.7301, "normal"),
        ("Hema Sundari",    "Tirunelveli Hub",     "Ambasamudram Town",            8.7078, 77.4573, "normal"),
        ("Ilakiya Devi",    "Tirunelveli Hub",     "Palayamkottai Cross",          8.7200, 77.7400, "urgent"),
        ("Jagadish Kumar",  "Tirunelveli Hub",     "Melapalayam North",            8.7300, 77.7350, "low"),
    ],
}

# Track which index to use next per city so orders rotate
ORDER_INDEX = {city: 0 for city in ORDER_POOL}

ASSIGNED = {}

def hav(a1,o1,a2,o2):
    R=6371; p1,p2=math.radians(a1),math.radians(a2)
    da=math.radians(a2-a1); do=math.radians(o2-o1)
    x=math.sin(da/2)**2+math.cos(p1)*math.cos(p2)*math.sin(do/2)**2
    return R*2*math.atan2(math.sqrt(x),math.sqrt(1-x))

def clamp(v,lo,hi): return max(lo,min(hi,v))

def move_toward(lat,lon,dlat,dlon,step):
    dy=dlat-lat; dx=dlon-lon
    mag=math.sqrt(dy*dy+dx*dx)
    if mag<1e-9: return dlat,dlon
    f=min(step/mag,1.0)
    return lat+dy*f, lon+dx*f

def api(method,path,**kw):
    try:
        fn=requests.post if method=="POST" else requests.get
        r=fn(f"{API}{path}",timeout=8,**kw)
        return r.status_code, r.json() if r.content else {}
    except Exception as e:
        return 0,{"error":str(e)}

def send_telemetry(vid,s):
    api("POST","/vehicles/update",json={
        "vehicle_id":      vid,
        "battery_percent": round(s["bat"],2),
        "temperature":     round(s["tmp"],2),
        "lat":             round(s["lat"],6),
        "lon":             round(s["lon"],6),
    })

def fetch_assigned():
    code,body=api("GET","/fleet/active_routes")
    if code!=200: return {}
    out={}
    for vid,info in body.get("data",{}).items():
        out[vid]={
            "order_id": info["order_id"],
            "dlat":     float(info["dlat"]),
            "dlon":     float(info["dlon"]),
            "area":     info.get("delivery_area",""),
            "priority": info.get("priority","normal"),
        }
    return out

def place_one_order(city):
    """Place one new order for the given city from the rotating pool."""
    pool = ORDER_POOL.get(city, ORDER_POOL["Chennai"])
    idx  = ORDER_INDEX[city] % len(pool)
    ORDER_INDEX[city] += 1
    cust, pickup, delivery, lat, lon, priority = pool[idx]
    oid = f"ORD-{city[:3].upper()}-{str(uuid.uuid4())[:6].upper()}"
    code, _ = api("POST", "/orders/place", json={
        "customer_name": cust,
        "pickup_area":   pickup,
        "delivery_area": delivery,
        "city":          city,
        "lat":           lat,
        "lon":           lon,
        "priority":      priority,
    })
    if code == 200:
        print(f"  📦 NEW ORDER placed: {oid} | {city} | {delivery} | {priority.upper()}")
        return True
    return False

def do_complete(order_id, area, vid, city):
    code, body = api("POST", f"/orders/{order_id}/complete")
    if code == 200:
        print(f"  ✅ DELIVERED  {vid} -> {area}  [{order_id}]")
        # Place one new order for the same city immediately after delivery
        place_one_order(city)
        return True
    print(f"  ⚠  complete failed {code} {body}")
    return False

def do_auto_assign():
    code, body = api("POST", "/orders/auto_assign")
    if code != 200: return 0
    d = body.get("data", {}); n = d.get("assigned", 0)
    if n > 0:
        print(f"\n  🎯 Auto-assigned {n} order(s):")
        for r in d.get("results", []):
            if r.get("assigned_to"):
                print(f"     {r['order_id']} -> {r['assigned_to']} ({r.get('distance_km','?')}km)")
    return n

def bat_update(s, moving):
    if s["chg"]:
        s["bat"] = min(100.0, s["bat"] + random.uniform(2.5, 4.0))
        s["tmp"] = max(28.0,  s["tmp"] - random.uniform(0.1, 0.4))
        if s["bat"] >= 90: s["chg"] = False
    else:
        drain = random.uniform(0.12, 0.28) + (0.12 if moving else 0)
        if s["tmp"] > 37: drain *= 1.2
        s["bat"] = max(0.0, s["bat"] - drain)
        s["tmp"] = max(28.0, min(45.0, s["tmp"] + random.uniform(-0.15, 0.25)))
        if s["bat"] < 15:
            s["chg"] = True
            print(f"  ⚡ battery low -> charging")
    return s

def wait_for_backend():
    print("⏳  Waiting for backend...")
    for i in range(60):
        code, body = api("GET", "/health")
        if code == 200:
            print(f"✅  Backend ready — {body.get('time_ist','')}")
            return True
        print(f"   attempt {i+1}/60...")
        time.sleep(3)
    return False

def main():
    print("="*60)
    print("🛺  SmartFleet TN Simulator v6 — Visible Pending Orders")
    print("  1 new order placed every time a delivery completes")
    print("  Auto-assign fires every 20 cycles (~100 seconds)")
    print("  Watch Pending Orders counter rise then drain on Overview tab")
    print("="*60)

    if not wait_for_backend():
        print("Backend not reachable — exiting")
        return

    time.sleep(2)

    print("\n🎯  Initial dispatch of all 50 pending orders...")
    do_auto_assign()
    time.sleep(1)

    ASSIGNED.update(fetch_assigned())
    print(f"📋  {len(ASSIGNED)} deliveries active\n")

    cycle        = 0
    assign_tick  = 0   # counts up to ASSIGN_EVERY before firing auto-assign
    order_tick   = 0   # counts up to ORDER_EVERY before placing new orders
    ASSIGN_EVERY = 20  # ~100 seconds — long enough to see pending counter build up
    ORDER_EVERY  = 3   # place 2 new orders every 3 cycles (~15s) so pending always accumulates

    while True:
        cycle       += 1
        assign_tick += 1
        order_tick  += 1
        print(f"\n── Cycle {cycle}  {time.strftime('%H:%M:%S')} ──  active={len(ASSIGNED)}  assign_in={ASSIGN_EVERY - assign_tick}  new_order_in={ORDER_EVERY - order_tick}")

        newly_delivered = []

        for vid, s in VEHICLES.items():
            delivery = ASSIGNED.get(vid)
            moving   = (delivery is not None and not s["chg"])
            s        = bat_update(s, moving)

            if s["chg"]:
                b = BOUNDS[s["city"]]
                s["lat"] = clamp(s["lat"] + random.uniform(-0.0001, 0.0001), b[0][0], b[0][1])
                s["lon"] = clamp(s["lon"] + random.uniform(-0.0001, 0.0001), b[1][0], b[1][1])
                print(f"  ⚡ {vid} charging {s['bat']:.1f}%")

            elif delivery:
                dlat, dlon = delivery["dlat"], delivery["dlon"]
                dist = hav(s["lat"], s["lon"], dlat, dlon)

                if dist < 0.15:
                    # ── ARRIVED ──────────────────────────────────
                    s["lat"], s["lon"] = dlat, dlon
                    if do_complete(delivery["order_id"], delivery["area"], vid, s["city"]):
                        del ASSIGNED[vid]
                        newly_delivered.append(vid)
                else:
                    # ── MOVING ───────────────────────────────────
                    step = 0.004 if delivery["priority"] == "urgent" else 0.003
                    nl, no = move_toward(s["lat"], s["lon"], dlat, dlon, step)
                    b = BOUNDS[s["city"]]
                    s["lat"] = clamp(nl, b[0][0], b[0][1])
                    s["lon"] = clamp(no, b[1][0], b[1][1])
                    icon = "🚨" if delivery["priority"] == "urgent" else "🚗"
                    print(f"  {icon} {vid} {s['bat']:.0f}% -> {delivery['area'][:25]} {dist:.2f}km left")

            else:
                # ── IDLE — drift toward city hub ──────────────
                hub      = CITY_HUBS[s["city"]]
                dist_hub = hav(s["lat"], s["lon"], hub[0], hub[1])
                if dist_hub > 0.3:
                    nl, no = move_toward(s["lat"], s["lon"], hub[0], hub[1], 0.002)
                    s["lat"], s["lon"] = nl, no
                else:
                    b = BOUNDS[s["city"]]
                    s["lat"] = clamp(s["lat"] + random.uniform(-0.0002, 0.0002), b[0][0], b[0][1])
                    s["lon"] = clamp(s["lon"] + random.uniform(-0.0002, 0.0002), b[1][0], b[1][1])
                print(f"  🛺 {vid} {s['bat']:.0f}% idle")

            VEHICLES[vid] = s
            send_telemetry(vid, s)

        if newly_delivered:
            print(f"\n  🎉 {len(newly_delivered)} delivery completed — {len(newly_delivered)} new order(s) added to queue")

        # ── PLACE NEW ORDERS every 3 cycles (~15s) ───────────────
        # Continuously adds orders so pending counter is ALWAYS visible
        # regardless of whether you open the browser early or late
        if order_tick >= ORDER_EVERY:
            order_tick = 0
            cities = list(ORDER_POOL.keys())
            # Place 2 orders per trigger — one urgent, one normal from random cities
            for _ in range(2):
                city = random.choice(cities)
                place_one_order(city)
            print(f"  📬 2 new orders queued — pending will rise until next auto-assign")

        # ── AUTO-ASSIGN every 20 cycles (~100s) ──────────────────
        # This is the key delay that makes pending orders visible on the dashboard
        if assign_tick >= ASSIGN_EVERY:
            print(f"\n  ⏰ Auto-assign firing (cycle {cycle})...")
            n = do_auto_assign()
            assign_tick = 0
            if n > 0:
                time.sleep(0.5)
                fresh = fetch_assigned()
                for vid, info in fresh.items():
                    if vid not in ASSIGNED:
                        ASSIGNED[vid] = info
                        print(f"  📥 {vid} -> {info['area']}")

        # ── SYNC new assignments every 2 cycles ──────────────────
        if cycle % 2 == 0:
            fresh = fetch_assigned()
            for vid, info in fresh.items():
                if vid not in ASSIGNED:
                    ASSIGNED[vid] = info
                    print(f"  📥 {vid} picked up: {info['area']}")

        time.sleep(5)

if __name__ == "__main__":
    main()
