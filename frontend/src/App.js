import React,{useState,useEffect,useRef,useCallback} from 'react';
import {Chart as ChartJS,CategoryScale,LinearScale,PointElement,LineElement,BarElement,Title,Tooltip,Legend,Filler} from 'chart.js';
import {Line,Bar} from 'react-chartjs-2';
ChartJS.register(CategoryScale,LinearScale,PointElement,LineElement,BarElement,Title,Tooltip,Legend,Filler);

const API = process.env.REACT_APP_API_URL||'http://localhost:8000';

// ── THEME CSS ──────────────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&family=Exo+2:wght@400;600;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:'Rajdhani',sans-serif;font-size:14px;min-height:100vh;transition:background .3s,color .3s}
:root,[data-theme=dark]{
  --bg:#04080d;--s1:#081220;--s2:#0c1a2e;--border:#1a3050;--border2:#0f2040;
  --text:#bdd8e8;--dim:#3a6070;--thead:#061018;--input:#0c1a2e;
  --hover:rgba(0,212,255,.04);--shadow:0 2px 12px rgba(0,0,0,.4);
  --topbar:rgba(8,18,32,.96);--tabbar:#081220;
  --cyan:#00d4ff;--green:#00ff9d;--orange:#ff7043;--yellow:#ffd740;--red:#ff1744;--purple:#b388ff;
  --mono:'Share Tech Mono',monospace;--head:'Exo 2',sans-serif;--r:8px;
}
[data-theme=light]{
  --bg:#f0f4f8;--s1:#fff;--s2:#e8f0f7;--border:#c5d8ea;--border2:#d8e8f4;
  --text:#1a3050;--dim:#6a90a8;--thead:#e0ecf5;--input:#fff;
  --hover:rgba(0,100,200,.04);--shadow:0 2px 12px rgba(0,0,0,.1);
  --topbar:rgba(255,255,255,.96);--tabbar:#fff;
  --cyan:#0077aa;--green:#007744;--orange:#cc4400;--yellow:#aa7700;--red:#cc0033;--purple:#6600cc;
  --mono:'Share Tech Mono',monospace;--head:'Exo 2',sans-serif;--r:8px;
}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:54px;background:var(--topbar);border-bottom:1px solid var(--border);backdrop-filter:blur(16px);position:sticky;top:0;z-index:999;box-shadow:var(--shadow);transition:background .3s}
.brand{display:flex;align-items:center;gap:9px}
.brand-icon{width:32px;height:32px;border-radius:8px;background:rgba(0,212,255,.12);border:1px solid rgba(0,212,255,.3);display:flex;align-items:center;justify-content:center;font-size:16px}
.brand-name{font-family:var(--head);font-weight:800;font-size:16px;letter-spacing:3px;color:var(--cyan)}
.brand-sub{font-family:var(--mono);font-size:8px;color:var(--dim);letter-spacing:2px}
.topbar-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.live-pill{display:flex;align-items:center;gap:4px;border:1px solid rgba(0,255,157,.3);border-radius:20px;padding:3px 8px;background:rgba(0,255,157,.08);font-family:var(--mono);font-size:9px;color:var(--green);letter-spacing:2px}
.live-dot{width:5px;height:5px;border-radius:50%;background:var(--green);animation:pulse 1.8s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
.clock{font-family:var(--mono);font-size:10px;color:var(--dim)}
.theme-btn{width:34px;height:18px;border-radius:9px;background:var(--border);border:1px solid var(--border2);position:relative;cursor:pointer;transition:background .3s}
.theme-btn.on{background:rgba(0,212,255,.2);border-color:var(--cyan)}
.theme-knob{position:absolute;top:2px;width:13px;height:13px;border-radius:50%;transition:all .3s;display:flex;align-items:center;justify-content:center;font-size:7px}
.theme-knob.dk{left:19px;background:var(--cyan)} .theme-knob.lt{left:2px;background:var(--yellow)}
.tabs{display:flex;gap:1px;padding:9px 20px 0;border-bottom:1px solid var(--border);background:var(--tabbar);overflow-x:auto;transition:background .3s}
.tab{padding:6px 13px;font-family:var(--head);font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--dim);cursor:pointer;border-radius:6px 6px 0 0;border:1px solid transparent;border-bottom:none;transition:all .2s;white-space:nowrap;background:transparent}
.tab:hover{color:var(--cyan);background:rgba(0,212,255,.05)}
.tab.active{color:var(--cyan);background:var(--bg);border-color:var(--border);border-bottom-color:var(--bg);margin-bottom:-1px}
.page{padding:14px 20px;display:none}
.page.show{display:grid;gap:13px}
.r2{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.r3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:13px}
.r4{display:grid;grid-template-columns:repeat(4,1fr);gap:11px}
.r31{display:grid;grid-template-columns:3fr 1fr;gap:13px}
.card{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);position:relative;overflow:hidden;box-shadow:var(--shadow);transition:background .3s,border-color .3s}
.card-accent::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--cyan),transparent);opacity:.5}
.ch{display:flex;align-items:center;justify-content:space-between;padding:9px 13px 7px;border-bottom:1px solid var(--border2);flex-wrap:wrap;gap:5px}
.ct{font-family:var(--head);font-weight:600;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--cyan)}
.cm{font-family:var(--mono);font-size:8px;color:var(--dim);letter-spacing:1px}
.cb{padding:11px 13px}
.stat-icon{font-size:17px;margin-bottom:4px} .stat-lbl{font-family:var(--mono);font-size:8px;letter-spacing:2px;color:var(--dim);text-transform:uppercase;margin-bottom:2px}
.stat-num{font-family:var(--head);font-weight:800;font-size:28px;line-height:1;color:var(--text)}
.stat-unit{font-family:var(--mono);font-size:8px;color:var(--dim);margin-top:2px}
.stat-bar{height:2px;background:var(--border);border-radius:1px;margin-top:7px;overflow:hidden}
.stat-fill{height:100%;border-radius:1px;transition:width .8s ease} .stat-trend{font-family:var(--mono);font-size:8px;margin-top:3px}
table{width:100%;border-collapse:collapse} thead tr{background:var(--thead)}
th{font-family:var(--mono);font-size:8px;letter-spacing:2px;color:var(--dim);padding:6px 10px;text-align:left;text-transform:uppercase}
td{padding:7px 10px;border-bottom:1px solid var(--border2);font-size:11px;transition:background .15s}
tbody tr:last-child td{border-bottom:none} tbody tr:hover td{background:var(--hover)}
.badge{display:inline-flex;align-items:center;gap:2px;padding:1px 6px;border-radius:3px;font-family:var(--mono);font-size:8px;font-weight:bold}
.b-ok{background:rgba(0,255,157,.1);color:#00cc7a;border:1px solid rgba(0,255,157,.25)}
.b-warn{background:rgba(255,215,64,.1);color:#d4a000;border:1px solid rgba(255,215,64,.25)}
.b-crit{background:rgba(255,23,68,.1);color:var(--red);border:1px solid rgba(255,23,68,.25)}
.b-info{background:rgba(0,212,255,.1);color:var(--cyan);border:1px solid rgba(0,212,255,.25)}
.b-purple{background:rgba(179,136,255,.1);color:var(--purple);border:1px solid rgba(179,136,255,.25)}
.sel{background:var(--input);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:5px;font-family:var(--mono);font-size:10px;outline:none;cursor:pointer}
.sel:focus{border-color:var(--cyan)}
.btn{padding:4px 12px;border-radius:5px;border:1px solid var(--cyan);background:rgba(0,212,255,.1);color:var(--cyan);font-family:var(--mono);font-size:10px;cursor:pointer;transition:all .15s}
.btn:hover{background:rgba(0,212,255,.2)} .btn:disabled{opacity:.5;cursor:not-allowed}
.bat-bar{height:2px;background:var(--border);border-radius:2px;margin-top:3px;overflow:hidden}
.bat-fill{height:100%;border-radius:2px;transition:width .5s}
.al{display:flex;align-items:flex-start;gap:9px;padding:7px 10px;border-radius:5px;margin-bottom:5px;border-left:3px solid}
.a-crit{background:rgba(255,23,68,.07);border-left-color:var(--red)}
.a-warn{background:rgba(255,215,64,.06);border-left-color:var(--yellow)}
.a-ok{background:rgba(0,255,157,.05);border-left-color:var(--green)}
.al-vid{font-family:var(--mono);font-size:8px;color:var(--cyan);margin-bottom:1px} .al-msg{font-size:11px;color:var(--text)}
.sum-row{display:flex;align-items:center;gap:7px;margin-bottom:4px}
.sum-lbl{font-family:var(--mono);font-size:8px;color:var(--dim);min-width:48px}
.sum-bg{flex:1;height:4px;background:var(--border);border-radius:3px;overflow:hidden}
.sum-fill{height:100%;border-radius:3px;transition:width 1s ease}
.sum-val{font-family:var(--mono);font-size:9px;color:var(--text);min-width:34px;text-align:right}
.vsrow{display:flex;gap:4px;align-items:center;flex-wrap:wrap}
.vsbtn{padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:var(--s2);color:var(--dim);font-family:var(--mono);font-size:8px;cursor:pointer;transition:all .15s}
.vsbtn:hover,.vsbtn.vsel{border-color:var(--cyan);color:var(--cyan);background:rgba(0,212,255,.1)}
.loading{font-family:var(--mono);font-size:10px;color:var(--dim);padding:18px;text-align:center;letter-spacing:2px;animation:fade 1.2s infinite}
@keyframes fade{0%,100%{opacity:1}50%{opacity:.3}}
.empty{font-family:var(--mono);font-size:10px;color:var(--dim);padding:14px;text-align:center}
.coord{font-family:var(--mono);font-size:9px;color:var(--dim)}
.pred-legend{display:flex;gap:12px;margin-top:6px;flex-wrap:wrap}
.pred-l{font-family:var(--mono);font-size:8px;color:var(--dim);display:flex;align-items:center;gap:4px}
.pred-line{width:14px;height:2px;border-radius:1px}
.mapbox{height:520px;width:100%;border-radius:7px}

/* Route progress bar in dispatch table */
.progress-wrap{width:100%;height:5px;background:var(--border);border-radius:3px;overflow:hidden;margin-top:3px}
.progress-fill{height:100%;border-radius:3px;transition:width .5s}

/* Moving vehicle animation overlay on route lines */
.leaflet-vehicle-pulse{animation:vpulse 1s ease-in-out infinite}
@keyframes vpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}

.map-legend{display:flex;gap:14px;flex-wrap:wrap;padding:7px 0 2px;font-family:var(--mono);font-size:9px;color:var(--dim)}
.leg-item{display:flex;align-items:center;gap:5px}
.leg-line{width:22px;height:3px;border-radius:2px}
.leg-dot{width:10px;height:10px;border-radius:50%}

@media(max-width:900px){.r2,.r3,.r4,.r31{grid-template-columns:1fr}.page{padding:10px}.topbar{padding:0 10px}.tabs{padding:7px 10px 0}}
`;

// ── UTILS ──────────────────────────────────────────────────────────
const bC = p=>p>=55?'#00cc7a':p>=30?'#d4a000':p>=15?'#ff7043':'#ff1744';
const bB = p=>p>=55?'b-ok':p>=30?'b-warn':'b-crit';
const pC = p=>p==='urgent'?'#ff1744':p==='normal'?'#ffd740':'#00ff9d';
const pCBg = p=>p==='urgent'?'rgba(255,23,68,.15)':p==='normal'?'rgba(255,215,64,.12)':'rgba(0,255,157,.1)';

const fmtT = iso=>{ try{ return new Date(iso).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour12:false}); }catch{return'—';}};
const fmtDT= iso=>{ try{ return new Date(iso).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'short',timeStyle:'short'}); }catch{return'—';}};

function hav(a1,o1,a2,o2){
  const R=6371,p1=a1*Math.PI/180,p2=a2*Math.PI/180,
    da=(a2-a1)*Math.PI/180,dO=(o2-o1)*Math.PI/180,
    x=Math.sin(da/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dO/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

// ── POLLING HOOK ───────────────────────────────────────────────────
function usePoll(url,ms=6000){
  const [data,setData]=useState(null);
  const urlRef=useRef(url);
  urlRef.current=url;
  useEffect(()=>{
    let live=true;
    function go(){
      fetch(urlRef.current)
        .then(r=>r.json())
        .then(j=>{ if(live&&j.status==='success') setData(JSON.parse(JSON.stringify(j.data))); })
        .catch(()=>{});
    }
    go();
    const t=setInterval(go,ms);
    return()=>{ live=false; clearInterval(t); };
  },[ms]); // eslint-disable-line
  return data;
}

// ── CHART OPTIONS ──────────────────────────────────────────────────
function chartOpts(dark){
  const g=dark?'rgba(26,48,80,.5)':'rgba(0,0,0,.07)';
  const t=dark?'#3a6070':'#8aaabb';
  return{
    responsive:true,maintainAspectRatio:false,animation:{duration:400},
    plugins:{legend:{display:false},tooltip:{
      backgroundColor:dark?'#0c1a2e':'#fff',borderColor:dark?'#1a3050':'#c5d8ea',borderWidth:1,
      titleColor:'#00d4ff',bodyColor:dark?'#bdd8e8':'#1a3050',
      titleFont:{family:"'Share Tech Mono'"},bodyFont:{family:"'Share Tech Mono'",size:10}
    }},
    scales:{
      x:{grid:{color:g},ticks:{color:t,font:{family:"'Share Tech Mono'",size:8},maxTicksLimit:8}},
      y:{grid:{color:g},ticks:{color:t,font:{family:"'Share Tech Mono'",size:8}}}
    }
  };
}

// ── FLEET MAP ──────────────────────────────────────────────────────
// Full-path route line: origin → destination (fixed anchor points)
// Vehicle marker moves along the line as telemetry updates
// "Traveled" portion shown in dimmed color, "remaining" in bright color
const FleetMap = React.forwardRef(function FleetMap({isDark, visible}, outerRef){
  const divRef  = useRef(null);
  const stateRef= useRef({
    map:null, tile:null,
    // vehicle markers + pulse circles
    vm:{}, vc:{},
    // per-order: full route line (origin→dest), traveled portion line, destination marker
    // routeOrigins: {order_id: [origLat, origLon]} — captured when order first seen
    routeOrigins:{},
    rl_full:{},   // full route polyline (origin → dest), faint/dashed
    rl_traveled:{}, // traveled segment (origin → current vehicle pos), bright
    rl_remain:{},   // remaining segment (current → dest), bright solid
    dm:{}, dc:{}, // destination markers + circles
    sm:{},        // station markers
    data:null
  });

  useEffect(()=>{
    if(!divRef.current||!window.L) return;
    const L=window.L; const S=stateRef.current;
    if(S.map) return;
    const m=L.map(divRef.current,{center:[11.1271,78.6569],zoom:7,preferCanvas:true});
    S.tile=L.tileLayer(
      isDark?'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            :'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {attribution:'&copy;CARTO &copy;OSM',maxZoom:19}
    ).addTo(m);
    S.map=m;
    setTimeout(()=>m.invalidateSize(),300);

    const t=setInterval(()=>{
      if(!S.map||!S.data||!window.L) return;
      redraw(L,S);
    },1500); // faster redraw = smoother movement
    return()=>{ clearInterval(t); m.remove(); S.map=null; };
  },[]); // eslint-disable-line

  useEffect(()=>{
    const S=stateRef.current;
    if(!S.tile) return;
    S.tile.setUrl(isDark
      ?'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      :'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png');
  },[isDark]);

  useEffect(()=>{
    if(visible&&stateRef.current.map)
      setTimeout(()=>stateRef.current.map.invalidateSize(),150);
  },[visible]);

  useEffect(()=>{
    if(divRef.current){
      divRef.current.__setMapData = d=>{ stateRef.current.data=d; };
    }
  });

  useEffect(()=>{
    if(outerRef){
      if(typeof outerRef==='function') outerRef(divRef.current);
      else outerRef.current=divRef.current;
    }
  });

  return <div ref={divRef} className="mapbox"/>;
});

function redraw(L,S){
  const {vehicles=[],stations=[],routes=[]}=S.data;

  // ── STATIONS ── add once
  stations.forEach(s=>{
    if(S.sm[s.name]) return;
    S.sm[s.name]=L.marker([+s.lat,+s.lon],{icon:L.divIcon({
      className:'',iconSize:[22,22],iconAnchor:[11,11],popupAnchor:[0,-11],
      html:`<div style="background:#00ff9d;width:22px;height:22px;border-radius:5px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font-size:11px">⚡</div>`
    })}).bindPopup(`<b style="color:#00d4ff;font-family:monospace">⚡ ${s.name}</b><br><small>${s.city}</small>`).addTo(S.map);
  });

  // ── ROUTES ── full-path with split: traveled dim / remaining bright
  const liveO=new Set(routes.map(r=>r.order_id));

  // Remove stale routes
  Object.keys(S.rl_full).forEach(oid=>{
    if(!liveO.has(oid)){
      S.rl_full[oid]?.remove();    delete S.rl_full[oid];
      S.rl_traveled[oid]?.remove();delete S.rl_traveled[oid];
      S.rl_remain[oid]?.remove();  delete S.rl_remain[oid];
      S.dm[oid]?.remove();         delete S.dm[oid];
      S.dc[oid]?.remove();         delete S.dc[oid];
      delete S.routeOrigins[oid];
    }
  });

  routes.forEach(r=>{
    if(!r.from_lat||!r.to_lat) return;
    const vPos=[+r.from_lat,+r.from_lon];
    const dest=[+r.to_lat,  +r.to_lon  ];
    const col =pC(r.priority);
    const colDim=r.priority==='urgent'?'rgba(255,23,68,.25)':r.priority==='normal'?'rgba(255,215,64,.2)':'rgba(0,255,157,.15)';

    // Capture origin the first time we see this order
    if(!S.routeOrigins[r.order_id]){
      S.routeOrigins[r.order_id]=[+r.from_lat,+r.from_lon];

      // Full ghost route: origin → destination (drawn once, never updated)
      S.rl_full[r.order_id]=L.polyline(
        [S.routeOrigins[r.order_id], dest],
        {color:colDim, weight:2, opacity:0.7, dashArray:'6 5'}
      ).addTo(S.map);

      // Traveled: origin → vehicle (starts as zero-length)
      S.rl_traveled[r.order_id]=L.polyline(
        [S.routeOrigins[r.order_id], vPos],
        {color:col, weight:3, opacity:0.6, dashArray:'4 3'}
      ).addTo(S.map);

      // Remaining: vehicle → destination (starts as full route)
      S.rl_remain[r.order_id]=L.polyline(
        [vPos, dest],
        {color:col, weight:r.priority==='urgent'?5:3.5, opacity:0.95}
      ).addTo(S.map);

      // Destination marker — placed once
      S.dm[r.order_id]=L.marker(dest,{icon:L.divIcon({
        className:'',iconSize:[28,28],iconAnchor:[14,28],popupAnchor:[0,-28],
        html:`<div style="background:${col};width:28px;height:28px;border-radius:6px 6px 6px 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.7)"><span style="transform:rotate(45deg);font-size:13px;display:block;text-align:center;line-height:24px">📦</span></div>`
      })}).bindPopup(
        `<b style="color:${col};font-family:monospace;font-size:12px">📦 ${r.order_id}</b>`+
        `<br><span style="font-family:monospace;font-size:10px;color:#00d4ff">🛺 ${r.vehicle_id}</span>`+
        `<br><span style="font-family:monospace;font-size:10px;color:#aaa">📍 ${r.delivery_area}</span>`+
        `<br><span style="font-family:monospace;font-size:10px;color:#aaa">👤 ${r.customer_name}</span>`+
        `<br><span style="font-family:monospace;font-size:10px;color:${col}">${(r.priority||'').toUpperCase()}</span>`+
        `<br><span style="font-family:monospace;font-size:10px;color:#aaa">📏 ${r.distance_km}km · ⏱~${r.eta_minutes}min</span>`
      ).addTo(S.map);
      S.dc[r.order_id]=L.circle(dest,{radius:200,color:col,fillColor:col,fillOpacity:0.1,weight:1}).addTo(S.map);

    } else {
      // Update the split lines every redraw cycle
      const orig=S.routeOrigins[r.order_id];
      if(S.rl_traveled[r.order_id]) S.rl_traveled[r.order_id].setLatLngs([orig, vPos]);
      if(S.rl_remain[r.order_id])   S.rl_remain[r.order_id].setLatLngs([vPos, dest]);
    }
  });

  // ── VEHICLES ── update marker position every cycle
  const liveV=new Set(vehicles.map(v=>v.vehicle_id));
  Object.keys(S.vm).forEach(vid=>{
    if(!liveV.has(vid)){ S.vm[vid].remove(); delete S.vm[vid]; S.vc[vid]?.remove(); delete S.vc[vid]; }
  });

  vehicles.forEach(v=>{
    const lat=+v.lat, lon=+v.lon;
    if(!lat||!lon) return;
    const pos=[lat,lon];
    const col=bC(v.battery_percent);
    const vr=routes.filter(r=>r.vehicle_id===v.vehicle_id);
    const isMoving=vr.length>0;

    const ri=vr.length
      ?vr.map(r=>{
          const dist=hav(+r.from_lat,+r.from_lon,+r.to_lat,+r.to_lon);
          const pct=Math.max(0,Math.min(100,100-(dist/r.distance_km*100)));
          return `<br><span style="color:#ffd740;font-family:monospace;font-size:10px">→${r.delivery_area} (~${r.eta_minutes}m)</span>`;
        }).join('')
      :`<br><span style="color:#3a6070;font-family:monospace;font-size:10px">idle</span>`;

    const popup=
      `<b style="color:#00d4ff;font-family:monospace">${v.vehicle_id}</b>`+
      `<br><span style="font-family:monospace;font-size:10px;color:#00d4ff">${v.name||''}</span>`+
      `<br><span style="font-family:monospace;font-size:10px;color:#888">${v.city||''}</span>`+
      `<br><span style="font-family:monospace;font-size:10px;color:#888">Bat: <b style="color:${col}">${(+v.battery_percent||0).toFixed(1)}%</b></span>`+
      `<br><span style="font-family:monospace;font-size:10px;color:#888">Temp: ${(+v.temperature||0).toFixed(1)}°C</span>`+
      ri+`<br><span style="font-family:monospace;font-size:9px;color:#555">${fmtT(v.timestamp)}</span>`;

    // Moving vehicles get a bigger, more prominent icon with pulse ring
    const sz=isMoving?34:28;
    const iH=isMoving
      ?`<div style="position:relative;width:${sz}px;height:${sz}px">
          <div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${col};opacity:0.5;animation:vpulse 1.2s ease-in-out infinite"></div>
          <div style="background:${col};width:${sz}px;height:${sz}px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 12px ${col}88;display:flex;align-items:center;justify-content:center;font-size:15px">🛺</div>
        </div>`
      :`<div style="background:${col};width:${sz}px;height:${sz}px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:13px;opacity:0.7">🛺</div>`;

    const icon=L.divIcon({className:'',html:iH,iconSize:[sz,sz],iconAnchor:[sz/2,sz/2],popupAnchor:[0,-sz/2]});

    if(S.vm[v.vehicle_id]){
      S.vm[v.vehicle_id].setLatLng(pos);
      S.vm[v.vehicle_id].setIcon(icon);
      S.vm[v.vehicle_id].setPopupContent(popup);
      S.vc[v.vehicle_id].setLatLng(pos);
      S.vc[v.vehicle_id].setStyle({color:col,fillColor:col});
    } else {
      S.vm[v.vehicle_id]=L.marker(pos,{icon,zIndexOffset:isMoving?1000:0}).bindPopup(popup).addTo(S.map);
      S.vc[v.vehicle_id]=L.circle(pos,{radius:120,color:col,fillColor:col,fillOpacity:0.12,weight:1}).addTo(S.map);
    }
  });
}

// ── STAT CARD ──────────────────────────────────────────────────────
function SC({icon,label,value,unit,color,fill,trend,trendColor}){
  return(
    <div className="card card-accent">
      <div className="cb">
        <div className="stat-icon">{icon}</div>
        <div className="stat-lbl">{label}</div>
        <div className="stat-num" style={{color}}>{value??'—'}</div>
        <div className="stat-unit">{unit}</div>
        <div className="stat-bar"><div className="stat-fill" style={{width:`${Math.min(fill??0,100)}%`,background:color}}/></div>
        {trend&&<div className="stat-trend" style={{color:trendColor}}>{trend}</div>}
      </div>
    </div>
  );
}

// ── PREDICTION CHART ───────────────────────────────────────────────
function PredChart({vid,dark}){
  const [p,setP]=useState(null);
  const [err,setErr]=useState(false);
  useEffect(()=>{
    let live=true;
    setP(null); setErr(false);
    function go(){
      fetch(`${API}/vehicles/predict_series/${vid}?steps=12`)
        .then(r=>r.json())
        .then(j=>{ if(live&&j.status==='success'){ setP(j.data); setErr(false); } })
        .catch(()=>{ if(live) setErr(true); });
    }
    go();
    // Poll every 4s so chart appears quickly after simulator starts sending data
    const t=setInterval(go,4000);
    return()=>{ live=false; clearInterval(t); };
  },[vid]);

  // Connection error
  if(err) return(
    <div style={{textAlign:'center',padding:16,fontFamily:'var(--mono)',fontSize:10,color:'var(--orange)'}}>
      ⚠️ Cannot reach backend — is it running?
    </div>
  );

  // No data yet at all
  if(!p) return(
    <div style={{textAlign:'center',padding:16}}>
      <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--cyan)',marginBottom:6}}>
        ⏳ Waiting for telemetry data...
      </div>
      <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--dim)'}}>
        Simulator sends readings every 5s — chart appears automatically
      </div>
      <div style={{height:4,background:'var(--border)',borderRadius:2,marginTop:10,overflow:'hidden'}}>
        <div style={{height:'100%',background:'var(--cyan)',borderRadius:2,animation:'fade 1.5s ease-in-out infinite',width:'60%'}}/>
      </div>
    </div>
  );

  // note = no_data
  if(p.note==='no_data'||(!p.historical||p.historical.length===0)) return(
    <div style={{textAlign:'center',padding:16,fontFamily:'var(--mono)',fontSize:10,color:'var(--dim)'}}>
      <div style={{color:'var(--cyan)',marginBottom:4}}>📡 No readings yet for {vid}</div>
      <div>Waiting for simulator to send first telemetry batch...</div>
      <div style={{height:4,background:'var(--border)',borderRadius:2,marginTop:10,overflow:'hidden'}}>
        <div style={{height:'100%',background:'var(--cyan)',borderRadius:2,animation:'fade 1.5s ease-in-out infinite',width:'40%'}}/>
      </div>
    </div>
  );

  // note = collecting — have some data but not enough for full regression
  const readings = p.readings ?? p.historical.length;
  if(p.note==='collecting'||readings<3){
    const pct=Math.round((readings/3)*100);
    return(
      <div style={{padding:'8px 0'}}>
        <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--cyan)',marginBottom:6}}>
          📡 Collecting data: {readings}/3 readings minimum
        </div>
        <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--dim)',marginBottom:8}}>
          Current: <span style={{color:'var(--warn)'}}>{p.historical[p.historical.length-1]?.toFixed(1)}%</span>
          &nbsp;·&nbsp; Need {3-readings} more reading{3-readings!==1?'s':''}
        </div>
        <div style={{height:5,background:'var(--border)',borderRadius:3,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${pct}%`,background:'var(--cyan)',borderRadius:3,transition:'width 0.5s'}}/>
        </div>
        <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--dim)',marginTop:4,textAlign:'right'}}>{pct}%</div>
      </div>
    );
  }
  const h=p.historical,pr=p.predicted;
  const tC={charging:'#00cc7a',stable:'#d4a000',draining:'#ff1744'};
  const data={
    labels:[...h.map((_,i)=>i%4===0?`T-${h.length-i}`:''),...pr.map((_,i)=>`+${(i+1)*5}s`)],
    datasets:[
      {label:'H',data:[...h,...Array(pr.length).fill(null)],borderColor:'#00d4ff',backgroundColor:'rgba(0,212,255,.07)',fill:true,tension:.4,pointRadius:0,borderWidth:1.5},
      {label:'P',data:[...Array(h.length-1).fill(null),h[h.length-1],...pr],borderColor:'#ffd740',backgroundColor:'rgba(255,215,64,.05)',fill:true,tension:.4,pointRadius:3,borderWidth:1.5,borderDash:[5,3]}
    ]
  };
  const o={...chartOpts(dark),scales:{...chartOpts(dark).scales,y:{...chartOpts(dark).scales.y,min:0,max:100}}};
  return(
    <div>
      <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--dim)',marginBottom:7}}>
        TREND:<span style={{color:tC[p.trend]}}> {p.trend?.toUpperCase()}</span>
        &nbsp;·&nbsp;SLOPE:<span style={{color:'var(--cyan)'}}> {p.slope}/step</span>
        &nbsp;·&nbsp;PTS:<span style={{color:'var(--cyan)'}}> {h.length}</span>
      </div>
      <div style={{height:190}}><Line data={data} options={o}/></div>
      <div className="pred-legend">
        <div className="pred-l"><div className="pred-line" style={{background:'#00d4ff'}}/>Historical</div>
        <div className="pred-l"><div className="pred-line" style={{background:'#ffd740'}}/>Predicted</div>
      </div>
    </div>
  );
}

// ── ORDERS TABLE ───────────────────────────────────────────────────
function OTable({city,status,rev}){
  const [rows,setRows]=useState([]); const [ld,setLd]=useState(true);
  const go=useCallback(()=>{
    let u=`${API}/orders/list?status=${status}&limit=60`;
    if(city) u+=`&city=${encodeURIComponent(city)}`;
    fetch(u).then(r=>r.json()).then(j=>{ if(j.status==='success') setRows(j.data); setLd(false); }).catch(()=>setLd(false));
  },[city,status]);
  useEffect(()=>{ go(); },[go]);
  useEffect(()=>{ if(rev>0) go(); },[rev,go]);
  useEffect(()=>{ const t=setInterval(go,5000); return()=>clearInterval(t); },[go]);
  const pB=p=>p==='urgent'?'b-crit':p==='normal'?'b-info':'b-ok';
  const sB=s=>s==='pending'?'b-warn':s==='assigned'||s==='in_progress'?'b-purple':'b-ok';
  if(ld) return <div className="loading">LOADING…</div>;
  if(!rows.length) return <div className="empty">No {status} orders{city?` in ${city}`:''}</div>;
  return(
    <div style={{overflowX:'auto'}}>
      <table>
        <thead><tr><th>Order ID</th><th>Customer</th><th>City</th><th>Delivery Area</th><th>Priority</th><th>Status</th><th>Vehicle</th><th>Dist</th><th>Placed (IST)</th></tr></thead>
        <tbody>{rows.map(o=>(
          <tr key={o.order_id}>
            <td><span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--cyan)'}}>{o.order_id}</span></td>
            <td style={{fontSize:10}}>{o.customer_name}</td>
            <td><span className="badge b-info" style={{fontSize:7}}>{o.city}</span></td>
            <td style={{fontSize:10}}>{o.delivery_area}</td>
            <td><span className={`badge ${pB(o.priority)}`}>{o.priority?.toUpperCase()}</span></td>
            <td><span className={`badge ${sB(o.status)}`}>{o.status?.replace('_',' ').toUpperCase()}</span></td>
            <td><span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--green)'}}>{o.assigned_vehicle||'—'}</span></td>
            <td><span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--dim)'}}>{o.estimated_distance_km?`${o.estimated_distance_km}km`:'—'}</span></td>
            <td><span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--dim)'}}>{fmtDT(o.created_at)}</span></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ── DISPATCH ROUTE CARD ────────────────────────────────────────────
// Shows each active delivery as a live route card with progress bar
function RouteCard({d}){
  const dist=+d.distance_km||0;
  const vlat=+d.vehicle_lat||0, vlon=+d.vehicle_lon||0;
  const dlat=+d.delivery_lat||0, dlon=+d.delivery_lon||0;
  const remaining=vlat&&dlat ? hav(vlat,vlon,dlat,dlon) : dist;
  const pct=dist>0 ? Math.max(0,Math.min(100,Math.round((1-remaining/dist)*100))) : 0;
  const col=pC(d.priority);
  const bat=+d.battery_percent||0;

  return(
    <div style={{
      background:'var(--s2)', border:`1px solid ${col}44`,
      borderLeft:`3px solid ${col}`, borderRadius:6, padding:'10px 12px',
      marginBottom:8, transition:'all .3s'
    }}>
      {/* Header row */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
        <div>
          <span className="badge b-info" style={{fontSize:7,marginRight:5}}>{d.vehicle_id}</span>
          <span className={`badge ${d.priority==='urgent'?'b-crit':d.priority==='normal'?'b-warn':'b-ok'}`} style={{fontSize:7}}>
            {d.priority==='urgent'?'🚨':'🚗'} {d.priority?.toUpperCase()}
          </span>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--cyan)'}}>{d.order_id}</div>
          <span className={`badge ${bB(bat)}`} style={{fontSize:7}}>{bat.toFixed(0)}%🔋</span>
        </div>
      </div>

      {/* Route */}
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5,fontSize:10}}>
        <span style={{color:'var(--dim)',fontFamily:'var(--mono)',fontSize:8}}>FROM</span>
        <span style={{color:'var(--cyan)',fontFamily:'var(--mono)',fontSize:8}}>{d.pickup_area}</span>
        <span style={{color:col,fontSize:14}}>→</span>
        <span style={{color:'var(--text)',fontWeight:600}}>{d.delivery_area}</span>
      </div>

      {/* Progress bar */}
      <div style={{marginBottom:4}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
          <span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--dim)'}}>
            {remaining.toFixed(1)}km remaining of {dist.toFixed(1)}km
          </span>
          <span style={{fontFamily:'var(--mono)',fontSize:8,color:col}}>{pct}% complete</span>
        </div>
        <div className="progress-wrap">
          <div className="progress-fill" style={{width:`${pct}%`,background:`linear-gradient(90deg,${col}88,${col})`}}/>
        </div>
      </div>

      {/* Footer: customer + ETA */}
      <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'var(--dim)',fontFamily:'var(--mono)'}}>
        <span>👤 {d.customer_name}</span>
        <span style={{color:'var(--yellow)'}}>⏱ ~{d.eta_minutes}min ETA</span>
      </div>

      {/* Charging warning */}
      {d.charging_needed&&(
        <div style={{marginTop:5,fontFamily:'var(--mono)',fontSize:8,color:'var(--orange)',background:'rgba(255,112,67,.1)',padding:'3px 7px',borderRadius:3}}>
          ⚡ Charge stop needed: {d.charging_needed}
        </div>
      )}
    </div>
  );
}

// ── MAP LEGEND ─────────────────────────────────────────────────────
function MapLegend(){
  return(
    <div className="map-legend">
      <div className="leg-item"><div className="leg-line" style={{background:'#ff1744'}}/><span>Urgent route</span></div>
      <div className="leg-item"><div className="leg-line" style={{background:'#ffd740'}}/><span>Normal route</span></div>
      <div className="leg-item"><div className="leg-line" style={{background:'#00ff9d'}}/><span>Low route</span></div>
      <div className="leg-item"><div className="leg-line" style={{background:'rgba(255,215,64,.3)',border:'1px dashed #ffd740'}}/><span>Full path</span></div>
      <div className="leg-item"><div className="leg-dot" style={{background:'#00d4ff'}}/><span>Idle vehicle</span></div>
      <div className="leg-item"><div className="leg-dot" style={{background:'#00ff9d',boxShadow:'0 0 6px #00ff9d'}}/><span>En-route vehicle</span></div>
      <div className="leg-item"><span style={{fontSize:12}}>📦</span><span>Destination</span></div>
      <div className="leg-item"><span style={{fontSize:12}}>⚡</span><span>Charging station</span></div>
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────
const TABS=['Overview','Live Map','Dispatch','Orders','Analytics','Prediction','Alerts'];
const CITIES=['Chennai','Coimbatore','Madurai','Salem','Trichy','Tirunelveli'];

export default function App(){
  const [tab,    setTab]   =useState(0);
  const [vid,    setVid]   =useState('TN01EV001');
  const [clock,  setClock] =useState('');
  const [isDark, setDark]  =useState(true);
  const [oF,     setOF]    =useState('pending');
  const [oC,     setOC]    =useState('');
  const [busy,   setBusy]  =useState(false);
  const [rev,    setRev]   =useState(0);
  const map1Ref=useRef(null);
  const map2Ref=useRef(null);

  useEffect(()=>{
    let el=document.getElementById('sf-css');
    if(!el){ el=document.createElement('style'); el.id='sf-css'; document.head.appendChild(el); }
    el.textContent=CSS;
    document.documentElement.setAttribute('data-theme','dark');
  },[]);
  useEffect(()=>{ document.documentElement.setAttribute('data-theme',isDark?'dark':'light'); },[isDark]);

  useEffect(()=>{
    const t=setInterval(()=>setClock(new Date().toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour12:false})),1000);
    return()=>clearInterval(t);
  },[]);

  // Map data — poll every 2s for smooth movement
  useEffect(()=>{
    let live=true;
    function go(){
      fetch(`${API}/fleet/map_data`)
        .then(r=>r.json())
        .then(j=>{
          if(!live||j.status!=='success') return;
          if(map1Ref.current?.__setMapData) map1Ref.current.__setMapData(j.data);
          if(map2Ref.current?.__setMapData) map2Ref.current.__setMapData(j.data);
          setMapData(j.data);
        }).catch(()=>{});
    }
    go();
    const t=setInterval(go,2000); // 2s for smooth vehicle movement
    return()=>{ live=false; clearInterval(t); };
  },[]); // eslint-disable-line

  const [mapData,  setMapData] =useState(null);
  const analytics  =usePoll(`${API}/fleet/analytics`,   6000);
  const vstatus    =usePoll(`${API}/vehicles/status`,    3000);
  const delivery   =usePoll(`${API}/fleet/delivery_plan`,5000);
  const route      =usePoll(`${API}/fleet/route_optimization`,8000);
  const history    =usePoll(`${API}/vehicles/history/${vid}`,4000);
  const alerts     =usePoll(`${API}/fleet/alerts`,       4000);
  const summary    =usePoll(`${API}/fleet/summary`,      15000);
  const orderStats =usePoll(`${API}/orders/stats`,       5000);
  const dispatch   =usePoll(`${API}/fleet/dispatch_board`,2500); // fast poll for live progress
  const recentDel  =usePoll(`${API}/orders/recent_deliveries?limit=20`,3000);

  const histS=history?[...history].reverse():[];
  // Chart.js needs >= 2 points to draw a line — if only 1 reading, duplicate it so it renders
  const chartData = histS.length===1 ? [histS[0],histS[0]] : histS;
  const hLbl = chartData.map((h,i)=>i%5===0?fmtT(h.timestamp):'');
  const opts =chartOpts(isDark);
  const o100 ={...opts,scales:{...opts.scales,y:{...opts.scales.y,min:0,max:100}}};
  // Show dots when few readings so single points are visible
  const ptRadius = histS.length<=3 ? 4 : 0;
  const batCh={labels:hLbl,datasets:[{label:'Bat%',data:chartData.map(h=>h.battery_percent),borderColor:'#00d4ff',backgroundColor:'rgba(0,212,255,.07)',fill:true,tension:.4,pointRadius:ptRadius,borderWidth:1.5}]};
  const tmpCh={labels:hLbl,datasets:[{label:'Temp°C',data:chartData.map(h=>h.temperature),borderColor:'#ff7043',backgroundColor:'rgba(255,112,67,.07)',fill:true,tension:.4,pointRadius:ptRadius,borderWidth:1.5}]};
  const cities=analytics?.city_breakdown?.map(c=>c.city)||[];
  const compCh=cities.length?{labels:cities,datasets:[{label:'Avg Bat',data:cities.map(c=>analytics.city_breakdown.find(x=>x.city===c)?.avg_battery||0),backgroundColor:['rgba(0,212,255,.6)','rgba(0,255,157,.6)','rgba(255,215,64,.6)','rgba(255,112,67,.6)','rgba(179,136,255,.6)','rgba(255,23,68,.6)'],borderColor:['#00d4ff','#00ff9d','#ffd740','#ff7043','#b388ff','#ff1744'],borderWidth:1.5,borderRadius:4}]}:null;

  const crit  =alerts?.filter(a=>a.level==='critical').length??0;
  const pend  =orderStats?.by_city?.reduce((a,c)=>a+(parseInt(c.pending)||0),0)??0;
  const urgP  =orderStats?.urgent_pending??0;
  const actD  =dispatch?.length??0;
  const deliv =orderStats?.by_city?.reduce((a,c)=>a+(parseInt(c.delivered)||0),0)??0;

  function doAssign(){
    setBusy(true);
    fetch(`${API}/orders/auto_assign`,{method:'POST'})
      .then(r=>r.json())
      .then(d=>{
        setBusy(false); setRev(x=>x+1);
        const n=d.data?.assigned??0;
        const res=d.data?.results||[];
        if(n>0) alert(`✅ Dispatched ${n} order(s)!\n\n`+res.filter(r=>r.assigned_to).map(r=>`${r.order_id} → ${r.assigned_to} (${r.distance_km}km)`).join('\n'));
        else    alert(`ℹ️ No orders dispatched.\n\n`+res.map(r=>`${r.order_id}: ${r.reason}`).join('\n'));
      })
      .catch(()=>{ setBusy(false); alert('⚠️ Backend unreachable'); });
  }

  const mapDivRef1=useCallback(el=>{ map1Ref.current=el; },[]);
  const mapDivRef2=useCallback(el=>{ map2Ref.current=el; },[]);

  return(
    <>
      {/* TOPBAR */}
      <div className="topbar">
        <div className="brand">
          <div className="brand-icon">🛺</div>
          <div>
            <div className="brand-name">SMARTFLEET</div>
            <div className="brand-sub">Tamil Nadu · 30 EVs · 6 Cities · Smart Dispatch</div>
          </div>
        </div>
        <div className="topbar-right">
          {urgP>0&&<span className="badge b-crit" style={{cursor:'pointer'}} onClick={()=>setTab(3)}>🚨 {urgP} URGENT</span>}
          {crit>0&&<span className="badge b-crit" style={{cursor:'pointer'}} onClick={()=>setTab(6)}>⚠️ {crit} ALERTS</span>}
          {actD>0&&<span className="badge b-purple" style={{cursor:'pointer'}} onClick={()=>setTab(2)}>🚛 {actD} LIVE</span>}
          <div className="live-pill"><span className="live-dot"/>LIVE IST</div>
          <div className="clock">{clock}</div>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--dim)'}}>{isDark?'🌙':'☀️'}</span>
            <div className={`theme-btn ${isDark?'on':''}`} onClick={()=>setDark(d=>!d)}>
              <div className={`theme-knob ${isDark?'dk':'lt'}`}>{isDark?'🌙':'☀️'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="tabs">
        {TABS.map((t,i)=>(
          <div key={t} className={`tab ${tab===i?'active':''}`} onClick={()=>setTab(i)}>
            {i===6&&(alerts?.length??0)>0?`${t}(${alerts.length})`:
             i===3&&pend>0?`${t}(${pend})`:
             i===2&&actD>0?`${t}(${actD})`:t}
          </div>
        ))}
      </div>

      {/* TAB 0: OVERVIEW */}
      <div className={`page ${tab===0?'show':''}`}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'11px'}}>
          <SC icon="🔋" label="Fleet Battery"   value={analytics?.avg_battery!=null?analytics.avg_battery.toFixed(1):null} unit="AVG %" color="var(--cyan)" fill={analytics?.avg_battery??0}/>
          <SC icon="🌡️" label="Avg Temperature" value={analytics?.avg_temperature!=null?analytics.avg_temperature.toFixed(1):null} unit="CELSIUS" color="var(--orange)" fill={(analytics?.avg_temperature??0)/50*100}/>
          <SC icon="🛺" label="Active Vehicles" value={analytics?.active_vehicles??null} unit="ONLINE/30" color="var(--green)" fill={(analytics?.active_vehicles??0)/30*100}/>
          <SC icon="✅" label="Delivered"        value={deliv} unit="ORDERS" color="var(--green)" fill={deliv/50*100} trend={`${pend} pending`} trendColor="var(--yellow)"/>
          <SC icon="📋" label="Pending Orders"   value={pend} unit="AWAITING" color={urgP>0?'var(--red)':'var(--yellow)'} fill={pend/50*100} trend={urgP>0?`${urgP} URGENT`:'NEEDS DISPATCH'} trendColor={urgP>0?'var(--red)':'var(--yellow)'}/>
        </div>

        <div className="card card-accent">
          <div className="ch"><span className="ct">City Fleet Status</span><span className="cm">TAMIL NADU · 6 DISTRICTS</span></div>
          <div className="cb" style={{padding:0}}>
            {!analytics?.city_breakdown?<div className="loading">LOADING…</div>:(
              <table>
                <thead><tr><th>City</th><th>Vehicles</th><th>Avg Battery</th><th>Pending</th><th>Assigned</th><th>Delivered</th></tr></thead>
                <tbody>{analytics.city_breakdown.map(c=>{
                  const co=orderStats?.by_city?.find(o=>o.city===c.city);
                  return(
                    <tr key={c.city}>
                      <td><span className="badge b-info">{c.city}</span></td>
                      <td style={{fontFamily:'var(--mono)',fontSize:10}}>{c.vehicles}</td>
                      <td><span className={`badge ${bB(c.avg_battery)}`}>{c.avg_battery}%</span><div className="bat-bar" style={{width:55}}><div className="bat-fill" style={{width:`${c.avg_battery}%`,background:bC(c.avg_battery)}}/></div></td>
                      <td>{parseInt(co?.pending)>0?<span className="badge b-warn">{co.pending}</span>:<span style={{color:'var(--dim)',fontFamily:'var(--mono)',fontSize:9}}>0</span>}</td>
                      <td>{parseInt(co?.assigned)>0?<span className="badge b-purple">{co.assigned}</span>:<span style={{color:'var(--dim)',fontFamily:'var(--mono)',fontSize:9}}>0</span>}</td>
                      <td>{parseInt(co?.delivered)>0?<span className="badge b-ok">{co.delivered}</span>:<span style={{color:'var(--dim)',fontFamily:'var(--mono)',fontSize:9}}>0</span>}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            )}
          </div>
        </div>

        <div className="r31">
          <div className="card card-accent">
            <div className="ch"><span className="ct">Live Vehicle Status</span><span className="cm">AUTO-REFRESH · IST</span></div>
            {!vstatus?<div className="loading">AWAITING…</div>:(
              <div style={{overflowX:'auto'}}>
                <table>
                  <thead><tr><th>Vehicle</th><th>City</th><th>Battery</th><th>Temp</th><th>GPS</th><th>Updated IST</th></tr></thead>
                  <tbody>{vstatus.map(v=>(
                    <tr key={v.vehicle_id}>
                      <td><span className="badge b-info" style={{fontSize:7}}>{v.vehicle_id}</span></td>
                      <td style={{fontSize:9,color:'var(--dim)'}}>{v.city}</td>
                      <td><span className={`badge ${bB(v.battery_percent)}`}>{v.battery_percent?.toFixed(1)}%</span><div className="bat-bar" style={{width:50}}><div className="bat-fill" style={{width:`${v.battery_percent}%`,background:bC(v.battery_percent)}}/></div></td>
                      <td style={{color:'var(--orange)',fontFamily:'var(--mono)',fontSize:9}}>{v.temperature?.toFixed(1)}°C</td>
                      <td><span className="coord">{v.lat?.toFixed(4)},{v.lon?.toFixed(4)}</span></td>
                      <td><span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--dim)'}}>{fmtT(v.timestamp)}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
          <div className="card card-accent">
            <div className="ch"><span className="ct">Route Alerts</span></div>
            <div className="cb">
              {!route?<div className="loading">…</div>:route.length===0?<div className="empty">✓ All OK</div>:
               route.slice(0,8).map(r=>(
                <div key={r.vehicle_id} style={{marginBottom:7}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                    <span className="badge b-info" style={{fontSize:7}}>{r.vehicle_id}</span>
                    <span className={`badge ${bB(r.battery_percent)}`}>{r.battery_percent}%</span>
                  </div>
                  <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--green)'}}>→{r.recommended_station}</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--dim)'}}>{r.distance_km}km</div>
                </div>
               ))}
            </div>
          </div>
        </div>

        <div className="card card-accent">
          <div className="ch"><span className="ct">Live Delivery Feed</span><span className="cm">{recentDel?.length??0} COMPLETED</span></div>
          <div className="cb" style={{padding:0}}>
            {!recentDel||!recentDel.length?<div className="empty">No deliveries yet — vehicles en route</div>:(
              <div style={{overflowX:'auto'}}>
                <table>
                  <thead><tr><th>Order ID</th><th>Customer</th><th>City</th><th>Delivered To</th><th>Vehicle</th><th>Priority</th><th>Dist</th><th>Delivered At (IST)</th></tr></thead>
                  <tbody>{recentDel.map(d=>(
                    <tr key={d.order_id}>
                      <td><span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--cyan)'}}>{d.order_id}</span></td>
                      <td style={{fontSize:10}}>{d.customer_name}</td>
                      <td><span className="badge b-info" style={{fontSize:7}}>{d.city}</span></td>
                      <td style={{fontSize:10,color:'var(--green)'}}>{d.delivery_area}</td>
                      <td><span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--cyan)'}}>{d.assigned_vehicle||d.vehicle_id||'—'}</span></td>
                      <td><span className={`badge ${d.priority==='urgent'?'b-crit':d.priority==='normal'?'b-info':'b-ok'}`}>{d.priority?.toUpperCase()}</span></td>
                      <td><span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--dim)'}}>{d.estimated_distance_km?`${d.estimated_distance_km}km`:'—'}</span></td>
                      <td><span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--green)'}}>{fmtDT(d.delivered_at)||fmtDT(d.completed_at)||'—'}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TAB 1: LIVE MAP */}
      <div className={`page ${tab===1?'show':''}`}>
        <div className="card card-accent">
          <div className="ch">
            <span className="ct">Tamil Nadu Fleet Live Map</span>
            <span className="cm">🛺 Vehicles animate as they travel · 📦 Destinations · Lines show full route + progress</span>
          </div>
          <div className="cb" style={{padding:8}}>
            <MapLegend/>
            <FleetMap ref={mapDivRef1} isDark={isDark} visible={tab===1}/>
          </div>
        </div>
        <div className="card card-accent">
          <div className="ch"><span className="ct">Charging Stations</span><span className="cm">12 ACROSS TN</span></div>
          <div className="cb" style={{padding:0}}>
            <table>
              <thead><tr><th>Station</th><th>City</th><th>Coordinates</th></tr></thead>
              <tbody>{(mapData?.stations||[]).map(s=>(
                <tr key={s.name}><td><span className="badge b-ok">⚡ {s.name}</span></td><td><span className="badge b-info">{s.city}</span></td><td><span className="coord">{s.lat?.toFixed(4)}°N,{s.lon?.toFixed(4)}°E</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>

      {/* TAB 2: DISPATCH */}
      <div className={`page ${tab===2?'show':''}`}>
        <div className="r4">
          <SC icon="🚛" label="Active Dispatches" value={actD} unit="IN TRANSIT" color="var(--cyan)" fill={actD/30*100}/>
          <SC icon="🚨" label="Urgent Routes" value={dispatch?.filter(d=>d.priority==='urgent').length??0} unit="HIGH PRIORITY" color="var(--red)" fill={(dispatch?.filter(d=>d.priority==='urgent').length??0)/10*100}/>
          <SC icon="⏱️" label="Avg ETA" value={actD?Math.round(dispatch.reduce((a,d)=>a+d.eta_minutes,0)/actD):0} unit="MINUTES" color="var(--purple)" fill={50}/>
          <SC icon="⚡" label="Need Charging" value={dispatch?.filter(d=>!d.battery_ok).length??0} unit="VEHICLES" color="var(--orange)" fill={(dispatch?.filter(d=>!d.battery_ok).length??0)/10*100} trend={dispatch?.filter(d=>!d.battery_ok).length>0?'ACTION REQUIRED':'✓ ALL OK'} trendColor={dispatch?.filter(d=>!d.battery_ok).length>0?'var(--orange)':'var(--green)'}/>
        </div>

        {/* Live Route Cards + Map side by side */}
        <div className="r2">
          <div className="card card-accent" style={{maxHeight:600,overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <div className="ch">
              <span className="ct">Live Route Progress</span>
              <span className="cm">{actD} ACTIVE DELIVERIES · UPDATES EVERY 2.5s</span>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'10px 13px'}}>
              {!dispatch||!dispatch.length
                ?<div className="empty">No active dispatches — click 🎯 Auto-Assign in Orders tab</div>
                :dispatch.map(d=><RouteCard key={d.order_id} d={d}/>)
              }
            </div>
          </div>

          <div className="card card-accent">
            <div className="ch">
              <span className="ct">Dispatch Live Map</span>
              <span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--dim)'}}>
                <span style={{color:'#ff1744'}}>━</span> Urgent &nbsp;
                <span style={{color:'#ffd740'}}>━</span> Normal &nbsp;
                <span style={{color:'#00ff9d'}}>━</span> Low &nbsp;
                <span style={{color:'rgba(255,215,64,.4)'}}>╌</span> Full path
              </span>
            </div>
            <div className="cb" style={{padding:8}}>
              <FleetMap ref={mapDivRef2} isDark={isDark} visible={tab===2}/>
            </div>
          </div>
        </div>

        {/* Dispatch detail table */}
        <div className="card card-accent">
          <div className="ch"><span className="ct">Dispatch Detail Board</span><span className="cm">{actD} ACTIVE · IST</span></div>
          <div className="cb" style={{padding:0}}>
            {!dispatch||!dispatch.length?<div className="empty">No active dispatches</div>:(
              <div style={{overflowX:'auto'}}>
                <table>
                  <thead><tr><th>Vehicle</th><th>City</th><th>Battery</th><th>Order</th><th>Customer</th><th>Pickup</th><th>Delivery Area</th><th>Priority</th><th>Progress</th><th>ETA</th><th>Since IST</th></tr></thead>
                  <tbody>{dispatch.map(d=>{
                    const vl=+d.vehicle_lat||0,vln=+d.vehicle_lon||0;
                    const dl=+d.delivery_lat||0,dln=+d.delivery_lon||0;
                    const rem=vl&&dl?hav(vl,vln,dl,dln):(+d.distance_km||0);
                    const pct=+d.distance_km>0?Math.max(0,Math.min(100,Math.round((1-rem/(+d.distance_km))*100))):0;
                    const col=pC(d.priority);
                    return(
                    <tr key={d.order_id}>
                      <td><span className="badge b-info" style={{fontSize:7}}>{d.vehicle_id}</span></td>
                      <td><span className="badge b-purple" style={{fontSize:7}}>{d.city}</span></td>
                      <td><span className={`badge ${bB(d.battery_percent)}`}>{d.battery_percent}%</span><div className="bat-bar" style={{width:45}}><div className="bat-fill" style={{width:`${d.battery_percent}%`,background:bC(d.battery_percent)}}/></div></td>
                      <td><span style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--cyan)'}}>{d.order_id}</span></td>
                      <td style={{fontSize:10}}>{d.customer_name}</td>
                      <td style={{fontSize:9,color:'var(--dim)'}}>{d.pickup_area}</td>
                      <td style={{fontSize:10}}>{d.delivery_area}</td>
                      <td><span className={`badge ${d.priority==='urgent'?'b-crit':d.priority==='normal'?'b-info':'b-ok'}`}>{d.priority?.toUpperCase()}</span></td>
                      <td style={{minWidth:90}}>
                        <div style={{fontFamily:'var(--mono)',fontSize:8,color:col,marginBottom:2}}>{pct}% · {rem.toFixed(1)}km left</div>
                        <div className="progress-wrap"><div className="progress-fill" style={{width:`${pct}%`,background:`linear-gradient(90deg,${col}88,${col})`}}/></div>
                      </td>
                      <td><span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--yellow)'}}>~{d.eta_minutes}m</span></td>
                      <td><span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--dim)'}}>{fmtT(d.assigned_at)}</span></td>
                    </tr>
                  );})}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TAB 3: ORDERS */}
      <div className={`page ${tab===3?'show':''}`}>
        <div className="r4">
          <SC icon="📋" label="Pending"   value={orderStats?.by_city?.reduce((a,c)=>a+(parseInt(c.pending)||0),0)??0}   unit="AWAITING"   color="var(--yellow)" fill={(orderStats?.by_city?.reduce((a,c)=>a+(parseInt(c.pending)||0),0)??0)/50*100}/>
          <SC icon="🚛" label="Assigned"  value={orderStats?.by_city?.reduce((a,c)=>a+(parseInt(c.assigned)||0),0)??0}  unit="DISPATCHED"  color="var(--purple)" fill={(orderStats?.by_city?.reduce((a,c)=>a+(parseInt(c.assigned)||0),0)??0)/50*100}/>
          <SC icon="✅" label="Delivered" value={deliv} unit="COMPLETED" color="var(--green)" fill={deliv/50*100}/>
          <SC icon="🚨" label="Urgent Left" value={urgP} unit="HIGH PRIORITY" color={urgP>0?'var(--red)':'var(--green)'} fill={urgP/15*100} trend={urgP>0?'NEEDS ATTENTION':'✓ ALL CLEAR'} trendColor={urgP>0?'var(--red)':'var(--green)'}/>
        </div>
        <div className="card card-accent">
          <div className="ch">
            <span className="ct">Smart Order Dispatch Engine</span>
            <div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap'}}>
              <select className="sel" value={oC} onChange={e=>setOC(e.target.value)}>
                <option value="">All Cities</option>
                {CITIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <select className="sel" value={oF} onChange={e=>setOF(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="delivered">Delivered</option>
              </select>
              <button className="btn" onClick={doAssign} disabled={busy}>
                {busy?'⏳ Dispatching…':'🎯 Auto-Assign Now'}
              </button>
            </div>
          </div>
          <div className="cb" style={{padding:0}}>
            <OTable city={oC} status={oF} rev={rev} key={`${oC}-${oF}`}/>
          </div>
        </div>
        <div className="card card-accent">
          <div className="ch"><span className="ct">Orders by City</span><span className="cm">DISTRICT BREAKDOWN</span></div>
          <div className="cb" style={{padding:0}}>
            <table>
              <thead><tr><th>City</th><th>Pending</th><th>Assigned</th><th>In Progress</th><th>Delivered</th><th>Urgent</th><th>Total</th></tr></thead>
              <tbody>{(orderStats?.by_city||[]).map(c=>(
                <tr key={c.city}>
                  <td><span className="badge b-info">{c.city}</span></td>
                  <td>{parseInt(c.pending)>0?<span className="badge b-warn">{c.pending}</span>:<span style={{color:'var(--dim)',fontFamily:'var(--mono)',fontSize:8}}>0</span>}</td>
                  <td>{parseInt(c.assigned)>0?<span className="badge b-purple">{c.assigned}</span>:<span style={{color:'var(--dim)',fontFamily:'var(--mono)',fontSize:8}}>0</span>}</td>
                  <td>{parseInt(c.in_progress)>0?<span className="badge b-info">{c.in_progress}</span>:<span style={{color:'var(--dim)',fontFamily:'var(--mono)',fontSize:8}}>0</span>}</td>
                  <td>{parseInt(c.delivered)>0?<span className="badge b-ok">{c.delivered}</span>:<span style={{color:'var(--dim)',fontFamily:'var(--mono)',fontSize:8}}>0</span>}</td>
                  <td>{parseInt(c.urgent_total)>0?<span className="badge b-crit">{c.urgent_total}</span>:<span style={{color:'var(--dim)',fontFamily:'var(--mono)',fontSize:8}}>0</span>}</td>
                  <td style={{fontFamily:'var(--mono)',fontSize:10}}>{c.total}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>

      {/* TAB 4: ANALYTICS */}
      <div className={`page ${tab===4?'show':''}`}>
        <div className="card card-accent">
          <div className="ch">
            <span className="ct">Vehicle Telemetry History</span>
            <div className="vsrow">
              {['TN01EV001','TN01EV002','TN01EV003','TN09EV001','TN09EV002','TN50EV001','TN50EV002','TN25EV001','TN45EV001','TN72EV001'].map(v=>(
                <button key={v} className={`vsbtn ${vid===v?'vsel':''}`} onClick={()=>setVid(v)}>{v}</button>
              ))}
            </div>
          </div>
          <div className="cb">
            {/* Live reading counter — always visible so user knows data is flowing */}
            <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--dim)',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>{histS.length>0?`📊 ${histS.length} readings loaded`:'⏳ Waiting for first reading...'}</span>
              {histS.length>0&&<span style={{color:'var(--green)'}}>✓ Live</span>}
            </div>
            <div className="r2">
              <div>
                <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--dim)',letterSpacing:2,marginBottom:5}}>BATTERY % — {vid}</div>
                <div style={{height:170}}>
                  {histS.length===0
                    ?<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}>
                        <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--dim)',textAlign:'center'}}>
                          <div style={{color:'var(--cyan)',marginBottom:6}}>⏳ No data yet</div>
                          <div style={{fontSize:9}}>Check simulator is running:<br/>docker-compose logs simulator</div>
                        </div>
                      </div>
                    :<Line data={batCh} options={o100}/>
                  }
                </div>
              </div>
              <div>
                <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--dim)',letterSpacing:2,marginBottom:5}}>TEMPERATURE °C — {vid}</div>
                <div style={{height:170}}>
                  {histS.length===0
                    ?<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}>
                        <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--dim)',textAlign:'center'}}>
                          <div style={{color:'var(--orange)',marginBottom:6}}>⏳ No data yet</div>
                          <div style={{fontSize:9}}>Waiting for simulator telemetry</div>
                        </div>
                      </div>
                    :<Line data={tmpCh} options={opts}/>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="r2">
          <div className="card card-accent">
            <div className="ch"><span className="ct">City Battery Comparison</span></div>
            <div className="cb">{compCh?<div style={{height:140}}><Bar data={compCh} options={o100}/></div>:<div className="loading">LOADING…</div>}</div>
          </div>
          <div className="card card-accent">
            <div className="ch"><span className="ct">Fleet Summary</span></div>
            <div className="cb" style={{maxHeight:280,overflowY:'auto'}}>
              {!summary?<div className="loading">LOADING…</div>:summary.map(v=>(
                <div key={v.vehicle_id} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--cyan)'}}>{v.vehicle_id}</span>
                    <span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--dim)'}}>{v.city}</span>
                    <span className={`badge ${bB(v.avg_battery)}`}>{v.avg_battery}%</span>
                  </div>
                  {[['BAT',v.avg_battery,v.avg_battery,'%',bC(v.avg_battery)],['TMP',v.avg_temp/50*100,v.avg_temp,'°C',v.avg_temp>38?'#ff1744':'#ff7043']].map(([l,f,val,u,c])=>(
                    <div className="sum-row" key={l}>
                      <div className="sum-lbl">{l}</div>
                      <div className="sum-bg"><div className="sum-fill" style={{width:`${Math.min(f,100)}%`,background:c}}/></div>
                      <div className="sum-val">{val}{u}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TAB 5: PREDICTION */}
      <div className={`page ${tab===5?'show':''}`}>
        <div className="card card-accent">
          <div className="ch">
            <span className="ct">Battery Prediction — NumPy Regression</span>
            <div className="vsrow">
              {['TN01EV001','TN01EV002','TN09EV001','TN50EV001','TN25EV001','TN45EV001','TN72EV001'].map(v=>(
                <button key={v} className={`vsbtn ${vid===v?'vsel':''}`} onClick={()=>setVid(v)}>{v}</button>
              ))}
            </div>
          </div>
          <div className="cb"><PredChart vid={vid} dark={isDark} key={vid}/></div>
        </div>
        <div className="card card-accent">
          <div className="ch"><span className="ct">Algorithm</span></div>
          <div className="cb" style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--dim)',lineHeight:2}}>
            <span style={{color:'var(--cyan)'}}>numpy.polyfit(x, battery_values, degree=1)</span><br/>
            1. Last 40 telemetry readings per vehicle<br/>
            2. Degree-1 polynomial least-squares fit<br/>
            3. Extrapolate 12 steps (~60s ahead)<br/>
            4. Clip to [0,100]%<br/>
            5. slope &lt; -0.2 = draining · |slope| ≤ 0.2 = stable · slope &gt; 0.2 = charging
          </div>
        </div>
      </div>

      {/* TAB 6: ALERTS */}
      <div className={`page ${tab===6?'show':''}`}>
        <div className="r4">
          <SC icon="🚨" label="Critical"       value={alerts?.filter(a=>a.level==='critical').length??0} unit="INCIDENTS" color="var(--red)"    fill={(alerts?.filter(a=>a.level==='critical').length??0)/10*100}/>
          <SC icon="⚠️" label="Warnings"       value={alerts?.filter(a=>a.level==='warning').length??0}  unit="INCIDENTS" color="var(--yellow)" fill={(alerts?.filter(a=>a.level==='warning').length??0)/15*100}/>
          <SC icon="🔋" label="Battery Issues"  value={alerts?.filter(a=>a.type==='battery').length??0}   unit="VEHICLES"  color="var(--orange)" fill={(alerts?.filter(a=>a.type==='battery').length??0)/10*100}/>
          <SC icon="🌡️" label="Temp Issues"     value={alerts?.filter(a=>a.type==='temperature').length??0} unit="VEHICLES" color="var(--purple)" fill={(alerts?.filter(a=>a.type==='temperature').length??0)/10*100}/>
        </div>
        <div className="r2">
          <div className="card card-accent">
            <div className="ch"><span className="ct">Active Alerts</span><span className="cm">{alerts?.length??0} TOTAL</span></div>
            <div className="cb">
              {!alerts?<div className="loading">SCANNING…</div>:alerts.length===0?<div className="empty">✓ No active alerts</div>:
               alerts.map((a,i)=>(
                <div key={i} className={`al ${a.level==='critical'?'a-crit':'a-warn'}`}>
                  <div style={{fontSize:14}}>{a.type==='battery'?'🔋':a.type==='temperature'?'🌡️':'📡'}</div>
                  <div>
                    <div className="al-vid">{a.vehicle_id}·{a.city}·<span className={`badge ${a.level==='critical'?'b-crit':'b-warn'}`}>{a.level?.toUpperCase()}</span></div>
                    <div className="al-msg">{a.message}</div>
                  </div>
                </div>
               ))}
            </div>
          </div>
          <div className="card card-accent">
            <div className="ch"><span className="ct">Delivery & Charge Status</span></div>
            <div className="cb" style={{maxHeight:380,overflowY:'auto'}}>
              {!delivery?<div className="loading">…</div>:delivery.map(d=>(
                <div key={d.vehicle_id} className={`al ${d.charging_stop?'a-warn':'a-ok'}`}>
                  <div>
                    <div style={{display:'flex',gap:5,marginBottom:2}}>
                      <span className="badge b-info" style={{fontSize:7}}>{d.vehicle_id}</span>
                      <span className="badge b-purple" style={{fontSize:7}}>{d.city}</span>
                      <span className={`badge ${bB(d.battery_percent)}`}>{d.battery_percent}%</span>
                    </div>
                    <div style={{fontSize:11}}>📦 {d.destination}</div>
                    {d.charging_stop?<div style={{fontFamily:'var(--mono)',fontSize:8,color:'#d4a000',marginTop:1}}>⚡ {d.charging_stop}</div>:<div style={{fontFamily:'var(--mono)',fontSize:8,color:'#00cc7a',marginTop:1}}>✓ Sufficient charge</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
