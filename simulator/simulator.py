"""
SmartFleet Tamil Nadu — Simulator v5  (real-time continuous delivery)
======================================================================
HOW IT WORKS:
  - All orders start as PENDING in the DB
  - Simulator calls auto_assign every cycle to dispatch pending -> vehicles
  - Vehicles move step-by-step (0.003 deg ~ 330m per 5s) toward destination
  - On arrival: marks order delivered, vehicle freed, picks up next order
  - After ALL orders delivered: re-seeds fresh orders so map stays active forever
  - Result: you can watch vehicles get assigned, move across the map, deliver, repeat
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

RESEED_ORDERS = [
    ("Aditya Kumar",   "Chennai Central Hub","Besant Nagar Beach Rd",   "Chennai",     13.0002,80.2707,"urgent"),
    ("Bhavya Nair",    "Guindy Warehouse",   "Thiruvanmiyur Signal",    "Chennai",     12.9829,80.2580,"normal"),
    ("Chandru Raj",    "OMR Distribution",   "Porur Bypass Road",       "Chennai",     13.0370,80.1570,"normal"),
    ("Divya Menon",    "Tambaram Hub",       "Nanganallur Market",      "Chennai",     12.9815,80.1432,"urgent"),
    ("Elan Selvam",    "Anna Nagar Hub",     "Korattur Main Road",      "Chennai",     13.1043,80.1952,"low"),
    ("Fathima Banu",   "CBE Central Hub",   "Coimbatore Airport Area", "Coimbatore",  11.0305,77.0437,"urgent"),
    ("Gopal Krishnan", "Peelamedu Hub",      "Kavundampalayam Cross",   "Coimbatore",  11.0512,76.9905,"normal"),
    ("Harini Devi",    "MDU Central Hub",    "Thirumangalam Junction",  "Madurai",      9.8723,78.0797,"normal"),
    ("Ilavarasan M",   "Mattuthavani Hub",   "Goripalayam Overbridge",  "Madurai",      9.9055,78.1305,"urgent"),
    ("Janani S",       "Salem Hub",          "Attur Bus Stand",         "Salem",       11.5986,78.6011,"normal"),
    ("Karan Pillai",   "Trichy Hub",         "Ariyamangalam Main",      "Trichy",      10.8762,78.7424,"urgent"),
    ("Lavanya R",      "Tirunelveli Hub",    "Pettai Junction",         "Tirunelveli",  8.7005,77.7301,"normal"),
    ("Manoj Babu",     "Chennai Central Hub","Egmore Station Area",     "Chennai",     13.0782,80.2617,"urgent"),
    ("Nithila Devi",   "Guindy Warehouse",   "St Thomas Mount",         "Chennai",     12.9925,80.1669,"normal"),
    ("Om Prakash",     "CBE Central Hub",   "Vadavalli Junction",      "Coimbatore",  10.9932,76.9196,"normal"),
    ("Pavithra K",     "MDU Central Hub",    "Anaiyur Village Road",    "Madurai",      9.9489,78.0523,"low"),
    ("Ragini Suresh",  "Trichy Hub",         "Manachanallur Main",      "Trichy",      10.8099,78.7897,"urgent"),
    ("Sathya Priya",   "Tirunelveli Hub",    "Ambasamudram Town",       "Tirunelveli",  8.7078,77.4573,"normal"),
    ("Tamilarasan V",  "Chennai Central Hub","Redhills Lake Road",      "Chennai",     13.1875,80.1711,"normal"),
    ("Uma Devi",       "Peelamedu Hub",      "Singanallur Lake Side",   "Coimbatore",  11.0019,77.0265,"urgent"),
]

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

def do_complete(order_id,area,vid):
    code,body=api("POST",f"/orders/{order_id}/complete")
    if code==200:
        print(f"  ✅ DELIVERED  {vid} -> {area}  [{order_id}]")
        return True
    print(f"  ⚠  complete failed {code} {body}")
    return False

def do_auto_assign():
    code,body=api("POST","/orders/auto_assign")
    if code!=200: return 0
    d=body.get("data",{}); n=d.get("assigned",0)
    if n>0:
        print(f"\n  🎯 Assigned {n} new order(s):")
        for r in d.get("results",[]):
            if r.get("assigned_to"):
                print(f"     {r['order_id']} -> {r['assigned_to']} ({r.get('distance_km','?')}km)")
    return n

def reseed_orders():
    print("\n  🔄 Reseeding fresh orders for continuous simulation...")
    placed=0
    for (cust,pickup,delivery,city,lat,lon,priority) in RESEED_ORDERS:
        oid=f"ORD-{city[:3].upper()}-{str(uuid.uuid4())[:6].upper()}"
        code,_=api("POST","/orders/place",json={
            "customer_name": cust,
            "pickup_area":   pickup,
            "delivery_area": delivery,
            "city":          city,
            "lat":           lat,
            "lon":           lon,
            "priority":      priority,
        })
        if code==200: placed+=1
    print(f"  📦 {placed} new orders placed!")
    time.sleep(1)
    do_auto_assign()

def bat_update(s,moving):
    if s["chg"]:
        s["bat"]=min(100.0, s["bat"]+random.uniform(2.5,4.0))
        s["tmp"]=max(28.0,  s["tmp"]-random.uniform(0.1,0.4))
        if s["bat"]>=90: s["chg"]=False
    else:
        drain=random.uniform(0.12,0.28)+(0.12 if moving else 0)
        if s["tmp"]>37: drain*=1.2
        s["bat"]=max(0.0, s["bat"]-drain)
        s["tmp"]=max(28.0,min(45.0, s["tmp"]+random.uniform(-0.15,0.25)))
        if s["bat"]<15:
            s["chg"]=True
            print(f"  ⚡ battery low -> charging")
    return s

def wait_for_backend():
    print("⏳  Waiting for backend...")
    for i in range(60):
        code,body=api("GET","/health")
        if code==200:
            print(f"✅  Backend ready — {body.get('time_ist','')}")
            return True
        print(f"   attempt {i+1}/60...")
        time.sleep(3)
    return False

def main():
    print("="*60)
    print("🛺  SmartFleet TN Simulator v5 — Real-time Continuous")
    print("  Each delivery takes ~60-90s to complete visibly on map")
    print("="*60)

    if not wait_for_backend():
        print("Backend not reachable — exiting")
        return

    time.sleep(2)

    print("\n🎯  Dispatching all pending orders...")
    do_auto_assign()
    time.sleep(1)

    ASSIGNED.update(fetch_assigned())
    print(f"📋  {len(ASSIGNED)} deliveries active\n")

    cycle=0
    assign_tick=0
    reseed_tick=0

    while True:
        cycle+=1
        assign_tick+=1
        reseed_tick+=1
        print(f"\n── Cycle {cycle}  {time.strftime('%H:%M:%S')} ──  active={len(ASSIGNED)}")

        newly_delivered=[]

        for vid,s in VEHICLES.items():
            delivery=ASSIGNED.get(vid)
            moving=(delivery is not None and not s["chg"])
            s=bat_update(s,moving)

            if s["chg"]:
                b=BOUNDS[s["city"]]
                s["lat"]=clamp(s["lat"]+random.uniform(-0.0001,0.0001),b[0][0],b[0][1])
                s["lon"]=clamp(s["lon"]+random.uniform(-0.0001,0.0001),b[1][0],b[1][1])
                print(f"  ⚡ {vid} charging {s['bat']:.1f}%")

            elif delivery:
                dlat,dlon=delivery["dlat"],delivery["dlon"]
                dist=hav(s["lat"],s["lon"],dlat,dlon)

                if dist<0.15:
                    s["lat"],s["lon"]=dlat,dlon
                    if do_complete(delivery["order_id"],delivery["area"],vid):
                        del ASSIGNED[vid]
                        newly_delivered.append(vid)
                        assign_tick=0
                else:
                    step=0.004 if delivery["priority"]=="urgent" else 0.003
                    nl,no=move_toward(s["lat"],s["lon"],dlat,dlon,step)
                    b=BOUNDS[s["city"]]
                    s["lat"]=clamp(nl,b[0][0],b[0][1])
                    s["lon"]=clamp(no,b[1][0],b[1][1])
                    icon="🚨" if delivery["priority"]=="urgent" else "🚗"
                    print(f"  {icon} {vid} {s['bat']:.0f}% -> {delivery['area'][:25]} {dist:.2f}km left")

            else:
                hub=CITY_HUBS[s["city"]]
                dist_hub=hav(s["lat"],s["lon"],hub[0],hub[1])
                if dist_hub>0.3:
                    nl,no=move_toward(s["lat"],s["lon"],hub[0],hub[1],0.002)
                    s["lat"],s["lon"]=nl,no
                else:
                    b=BOUNDS[s["city"]]
                    s["lat"]=clamp(s["lat"]+random.uniform(-0.0002,0.0002),b[0][0],b[0][1])
                    s["lon"]=clamp(s["lon"]+random.uniform(-0.0002,0.0002),b[1][0],b[1][1])
                print(f"  🛺 {vid} {s['bat']:.0f}% idle")

            VEHICLES[vid]=s
            send_telemetry(vid,s)

        if newly_delivered:
            print(f"\n  🎉 {len(newly_delivered)} delivery completed: {newly_delivered}")

        # Assign pending orders to free vehicles every 4 cycles or after delivery
        if assign_tick>=4 or newly_delivered:
            n=do_auto_assign()
            assign_tick=0
            if n>0:
                time.sleep(0.5)
                fresh=fetch_assigned()
                for vid,info in fresh.items():
                    if vid not in ASSIGNED:
                        ASSIGNED[vid]=info
                        print(f"  📥 {vid} -> {info['area']}")

        # Check if all orders done and reseed every 10 cycles
        if reseed_tick>=10:
            reseed_tick=0
            code,body=api("GET","/fleet/analytics")
            if code==200:
                od=body.get("data",{}).get("orders",{})
                active=od.get("pending",0)+od.get("in_progress",0)+od.get("assigned",0)
                print(f"  📊 Active orders pipeline: {active}")
                if active==0:
                    reseed_orders()
                    time.sleep(2)
                    fresh=fetch_assigned()
                    for vid,info in fresh.items():
                        if vid not in ASSIGNED:
                            ASSIGNED[vid]=info

        # Sync assignments every 2 cycles
        if cycle%2==0:
            fresh=fetch_assigned()
            for vid,info in fresh.items():
                if vid not in ASSIGNED:
                    ASSIGNED[vid]=info
                    print(f"  📥 {vid} picked up: {info['area']}")

        time.sleep(5)

if __name__=="__main__":
    main()
