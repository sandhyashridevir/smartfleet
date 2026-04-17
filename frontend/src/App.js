import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@300;400;500;600;700&family=Exo+2:wght@200;300;400;600;800&display=swap');
  :root {
    --bg:#04080d; --s1:#081220; --s2:#0c1a2e; --s3:#112338;
    --border:#1a3050; --border2:#0f2040;
    --cyan:#00d4ff; --green:#00ff9d; --orange:#ff7043;
    --yellow:#ffd740; --red:#ff1744; --purple:#b388ff;
    --text:#bdd8e8; --dim:#3a6070;
    --mono:'Share Tech Mono',monospace;
    --head:'Exo 2',sans-serif; --body:'Rajdhani',sans-serif; --r:6px;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:var(--body);font-size:15px;min-height:100vh;
    background-image:radial-gradient(ellipse 100% 50% at 50% -5%,rgba(0,212,255,.07) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 100% 100%,rgba(0,255,157,.04) 0%,transparent 60%);}
  body::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:9999;
    background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,212,255,.012) 3px,rgba(0,212,255,.012) 4px);}

  .topbar{display:flex;align-items:center;justify-content:space-between;padding:0 28px;height:58px;
    background:rgba(8,18,32,.96);border-bottom:1px solid var(--border);backdrop-filter:blur(16px);
    position:sticky;top:0;z-index:200;}
  .brand{display:flex;align-items:center;gap:12px}
  .brand-icon{width:36px;height:36px;border-radius:8px;background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.3);
    display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 12px rgba(0,212,255,.2);}
  .brand-name{font-family:var(--head);font-weight:800;font-size:19px;letter-spacing:2px;color:#fff}
  .brand-sub{font-family:var(--mono);font-size:9px;color:var(--dim);letter-spacing:3px;margin-top:1px}
  .topbar-right{display:flex;align-items:center;gap:16px}
  .live-pill{display:flex;align-items:center;gap:6px;border:1px solid rgba(0,255,157,.25);border-radius:20px;
    padding:4px 12px;background:rgba(0,255,157,.06);font-family:var(--mono);font-size:10px;color:var(--green);letter-spacing:2px;}
  .live-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 1.8s infinite}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
  .clock{font-family:var(--mono);font-size:13px;color:var(--dim)}

  .tabs{display:flex;gap:2px;padding:12px 28px 0;border-bottom:1px solid var(--border);background:var(--s1)}
  .tab{padding:8px 20px;font-family:var(--head);font-size:11px;font-weight:600;letter-spacing:2px;
    text-transform:uppercase;color:var(--dim);cursor:pointer;border-radius:4px 4px 0 0;
    border:1px solid transparent;border-bottom:none;transition:all .2s;background:transparent;}
  .tab:hover{color:var(--cyan);background:rgba(0,212,255,.04)}
  .tab.active{color:var(--cyan);background:var(--bg);border-color:var(--border);border-bottom-color:var(--bg);margin-bottom:-1px}

  .page{padding:20px 28px;display:none}
  .page.show{display:grid;gap:18px}
  .r2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  .r3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px}
  .r4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  .r31{display:grid;grid-template-columns:3fr 1fr;gap:18px}
  .r21{display:grid;grid-template-columns:2fr 1fr;gap:18px}

  .card{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);position:relative;overflow:hidden}
  .card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;
    background:linear-gradient(90deg,transparent 0%,var(--cyan) 50%,transparent 100%);opacity:.4}
  .ch{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px;border-bottom:1px solid var(--border2)}
  .ct{font-family:var(--head);font-weight:600;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:var(--cyan)}
  .cm{font-family:var(--mono);font-size:9px;color:var(--dim);letter-spacing:1px}
  .cb{padding:14px 16px}

  .stat-icon{font-size:22px;line-height:1;margin-bottom:6px}
  .stat-num{font-family:var(--head);font-weight:800;font-size:38px;line-height:1;color:#fff}
  .stat-unit{font-family:var(--mono);font-size:10px;color:var(--dim);margin-top:2px;letter-spacing:1px}
  .stat-bar{height:2px;background:var(--border);border-radius:1px;margin-top:10px;overflow:hidden}
  .stat-fill{height:100%;border-radius:1px;background:currentColor;transition:width .8s ease}
  .stat-trend{font-family:var(--mono);font-size:9px;margin-top:4px}

  table{width:100%;border-collapse:collapse}
  thead tr{border-bottom:1px solid var(--border)}
  th{font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--dim);padding:8px 14px;text-align:left;text-transform:uppercase}
  td{padding:9px 14px;border-bottom:1px solid var(--border2);font-size:13px}
  tbody tr:last-child td{border-bottom:none}
  tbody tr:hover td{background:rgba(0,212,255,.03)}

  .badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:3px;font-family:var(--mono);font-size:10px;font-weight:bold}
  .b-ok{background:rgba(0,255,157,.1);color:var(--green);border:1px solid rgba(0,255,157,.2)}
  .b-warn{background:rgba(255,215,64,.1);color:var(--yellow);border:1px solid rgba(255,215,64,.2)}
  .b-crit{background:rgba(255,23,68,.12);color:var(--red);border:1px solid rgba(255,23,68,.25)}
  .b-info{background:rgba(0,212,255,.1);color:var(--cyan);border:1px solid rgba(0,212,255,.2)}
  .b-purple{background:rgba(179,136,255,.1);color:var(--purple);border:1px solid rgba(179,136,255,.2)}

  .sel{background:var(--s2);border:1px solid var(--border);color:var(--text);padding:6px 12px;border-radius:4px;font-family:var(--mono);font-size:11px;outline:none;cursor:pointer}
  .sel:focus{border-color:var(--cyan)}

  .bat-bar{height:3px;background:var(--border);border-radius:2px;margin-top:4px;overflow:hidden}
  .bat-fill{height:100%;border-radius:2px}

  .alert-item{display:flex;align-items:flex-start;gap:12px;padding:10px 14px;border-radius:4px;margin-bottom:8px;border-left:3px solid}
  .a-crit{background:rgba(255,23,68,.08);border-left-color:var(--red)}
  .a-warn{background:rgba(255,215,64,.06);border-left-color:var(--yellow)}
  .a-ok{background:rgba(0,255,157,.04);border-left-color:var(--green)}
  .alert-vid{font-family:var(--mono);font-size:10px;color:var(--cyan)}
  .alert-msg{font-size:13px;color:var(--text);margin-top:1px}

  .sum-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .sum-lbl{font-family:var(--mono);font-size:9px;color:var(--dim);min-width:55px;letter-spacing:1px}
  .sum-bg{flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden}
  .sum-fill{height:100%;border-radius:3px;transition:width 1s ease}
  .sum-val{font-family:var(--mono);font-size:10px;color:var(--text);min-width:38px;text-align:right}

  .vsbtn{padding:5px 14px;border-radius:4px;border:1px solid var(--border);background:var(--s2);color:var(--dim);font-family:var(--mono);font-size:11px;cursor:pointer;transition:all .15s}
  .vsbtn:hover{border-color:var(--cyan);color:var(--cyan)}
  .vsbtn.vsel{background:rgba(0,212,255,.12);border-color:var(--cyan);color:var(--cyan)}
  .vsrow{display:flex;gap:6px;align-items:center}

  .loading{font-family:var(--mono);font-size:11px;color:var(--dim);padding:24px;text-align:center;letter-spacing:2px;animation:fade 1.2s infinite}
  @keyframes fade{0%,100%{opacity:1}50%{opacity:.3}}
  .empty{font-family:var(--mono);font-size:11px;color:var(--dim);padding:20px;text-align:center}
  .coord{font-family:var(--mono);font-size:11px;color:var(--dim)}

  .pred-legend{display:flex;gap:16px;margin-top:8px}
  .pred-l{font-family:var(--mono);font-size:9px;color:var(--dim);display:flex;align-items:center;gap:5px}
  .pred-line{width:18px;height:2px;border-radius:1px}

  @media(max-width:900px){
    .r2,.r3,.r4,.r31,.r21{grid-template-columns:1fr}
    .page{padding:14px} .topbar{padding:0 14px} .tabs{padding:10px 14px 0}
  }
`;

// ── UTILS ────────────────────────────────────────────────────────────────────

function batColor(p) {
  if (p >= 55) return 'var(--green)';
  if (p >= 30) return 'var(--yellow)';
  if (p >= 15) return 'var(--orange)';
  return 'var(--red)';
}
function batBadge(p) { return p >= 55 ? 'b-ok' : p >= 30 ? 'b-warn' : 'b-crit'; }

const CHART_OPTS = {
  responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#0c1a2e', borderColor: '#1a3050', borderWidth: 1, titleColor: '#00d4ff', bodyColor: '#bdd8e8', titleFont: { family: "'Share Tech Mono'" }, bodyFont: { family: "'Share Tech Mono'", size: 11 } }
  },
  scales: {
    x: { grid: { color: 'rgba(26,48,80,.5)' }, ticks: { color: '#3a6070', font: { family: "'Share Tech Mono'", size: 9 }, maxTicksLimit: 8 } },
    y: { grid: { color: 'rgba(26,48,80,.5)' }, ticks: { color: '#3a6070', font: { family: "'Share Tech Mono'", size: 9 } } }
  }
};

// ── HOOKS ────────────────────────────────────────────────────────────────────

function useInterval(fn, ms) {
  const fnRef = React.useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    fnRef.current();
    const t = setInterval(() => fnRef.current(), ms);
    return () => clearInterval(t);
  }, [ms]);
}

function usePoll(url, ms = 10000) {
  const [data, setData] = useState(null);
  const doFetch = useCallback(() => {
    fetch(url).then(r => r.json()).then(j => { if (j.status === 'success') setData(j.data); }).catch(() => {});
  }, [url]);
  useInterval(doFetch, ms);
  return data;
}

// ── COMPONENTS ───────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, unit, color, fill, trend, trendColor }) {
  return (
    <div className="card">
      <div className="cb">
        <div className="stat-icon">{icon}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, color: 'var(--dim)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
        <div className="stat-num" style={{ color }}>{value ?? '—'}</div>
        <div className="stat-unit">{unit}</div>
        <div className="stat-bar"><div className="stat-fill" style={{ width: `${Math.min(fill ?? 0, 100)}%`, color }} /></div>
        {trend && <div className="stat-trend" style={{ color: trendColor }}>{trend}</div>}
      </div>
    </div>
  );
}

function FleetMap({ mapData }) {
  if (!mapData) return <div className="loading">LOADING MAP…</div>;
  const { vehicles = [], stations = [] } = mapData;
  const all = [...vehicles, ...stations].filter(p => p.lat && p.lon);
  if (!all.length) return <div className="empty">No GPS data yet</div>;

  const lats = all.map(p => p.lat), lons = all.map(p => p.lon);
  const pad = 0.006;
  const minLat = Math.min(...lats) - pad, maxLat = Math.max(...lats) + pad;
  const minLon = Math.min(...lons) - pad, maxLon = Math.max(...lons) + pad;
  const W = 640, H = 340;
  const proj = (lat, lon) => [
    ((lon - minLon) / (maxLon - minLon)) * (W - 70) + 35,
    ((maxLat - lat) / (maxLat - minLat)) * (H - 70) + 35
  ];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', background: 'var(--s2)', borderRadius: 4, border: '1px solid var(--border)' }}>
        {[.25,.5,.75].map(f => (
          <React.Fragment key={f}>
            <line x1={35 + f*(W-70)} y1={35} x2={35 + f*(W-70)} y2={H-35} stroke="rgba(26,48,80,.5)" strokeWidth="1" strokeDasharray="4 4" />
            <line x1={35} y1={35 + f*(H-70)} x2={W-35} y2={35 + f*(H-70)} stroke="rgba(26,48,80,.5)" strokeWidth="1" strokeDasharray="4 4" />
          </React.Fragment>
        ))}
        {stations.map(s => {
          const [x, y] = proj(s.lat, s.lon);
          return (
            <g key={s.name}>
              <circle cx={x} cy={y} r={16} fill="rgba(0,255,157,.05)" stroke="rgba(0,255,157,.35)" strokeWidth="1.5" />
              <text x={x} y={y+1} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#00ff9d">⚡</text>
              <text x={x} y={y+26} textAnchor="middle" fontSize="8" fill="#00ff9d" fontFamily="Share Tech Mono">{s.name}</text>
            </g>
          );
        })}
        {vehicles.map(v => {
          const [x, y] = proj(v.lat, v.lon);
          const c = batColor(v.battery_percent);
          return (
            <g key={v.vehicle_id}>
              <circle cx={x} cy={y} r={18} fill="none" stroke={c} strokeWidth="1" opacity=".3">
                <animate attributeName="r" values="14;26;14" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values=".5;0;.5" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx={x} cy={y} r={11} fill={c+'18'} stroke={c} strokeWidth="1.5" />
              <text x={x} y={y+1} textAnchor="middle" dominantBaseline="middle" fontSize="10">🚐</text>
              <text x={x} y={y-20} textAnchor="middle" fontSize="8" fill={c} fontFamily="Share Tech Mono" fontWeight="bold">{v.vehicle_id}</text>
              <text x={x} y={y+26} textAnchor="middle" fontSize="8" fill={c} fontFamily="Share Tech Mono">{v.battery_percent?.toFixed(0)}%</text>
            </g>
          );
        })}
        <text x={10} y={16} fontSize="8" fill="rgba(58,96,112,.6)" fontFamily="Share Tech Mono">SF BAY AREA — LIVE GPS TRACKING</text>
      </svg>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
        {[['var(--green)', 'High (>55%)'], ['var(--yellow)', 'Medium (30-55%)'], ['var(--red)', 'Low (<30%)'], ['rgba(0,255,157,.5)', 'Charging Station']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
          </div>
        ))}
      </div>
    </div>
  );
}

function PredictionChart({ vehicleId }) {
  const [pred, setPred] = useState(null);
  const doFetch = useCallback(() => {
    fetch(`${API}/vehicles/predict_series/${vehicleId}?steps=12`)
      .then(r => r.json()).then(j => j.status === 'success' && setPred(j.data)).catch(() => {});
  }, [vehicleId]);
  useInterval(doFetch, 10000);

  if (!pred?.historical) return <div className="loading">COMPUTING PREDICTION…</div>;

  const hist = pred.historical, prd = pred.predicted;
  const histL = hist.map((_, i) => i % 4 === 0 ? `T-${hist.length - i}` : '');
  const predL = prd.map((_, i) => `+${(i+1)*5}s`);

  const chartData = {
    labels: [...histL, ...predL],
    datasets: [
      { label: 'Historical', data: [...hist, ...Array(prd.length).fill(null)], borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,.07)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
      { label: 'Predicted', data: [...Array(hist.length-1).fill(null), hist[hist.length-1], ...prd], borderColor: '#ffd740', backgroundColor: 'rgba(255,215,64,.05)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 1.5, borderDash: [5,3] }
    ]
  };
  const tC = { charging: 'var(--green)', stable: 'var(--yellow)', draining: 'var(--red)' };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)' }}>
          TREND: <span style={{ color: tC[pred.trend] }}>{pred.trend?.toUpperCase()}</span>&nbsp;|&nbsp;
          SLOPE: <span style={{ color: 'var(--cyan)' }}>{pred.slope}/step</span>&nbsp;|&nbsp;
          POINTS: <span style={{ color: 'var(--cyan)' }}>{pred.historical?.length}</span>
        </div>
      </div>
      <div style={{ position: 'relative', height: 200 }}>
        <Line data={chartData} options={{ ...CHART_OPTS, scales: { ...CHART_OPTS.scales, y: { ...CHART_OPTS.scales.y, min: 0, max: 100 } } }} />
      </div>
      <div className="pred-legend">
        <div className="pred-l"><div className="pred-line" style={{ background: 'var(--cyan)' }} />Historical data</div>
        <div className="pred-l"><div className="pred-line" style={{ background: 'var(--yellow)', opacity: .8 }} />Predicted (NumPy linear regression)</div>
      </div>
    </div>
  );
}

function SummaryBars({ summary }) {
  if (!summary) return <div className="loading">LOADING…</div>;
  return summary.map(v => (
    <div key={v.vehicle_id} style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cyan)' }}>{v.vehicle_id}</span>
        <span className={`badge ${batBadge(v.avg_battery)}`}>{v.avg_battery}%</span>
      </div>
      {[['AVG BAT', v.avg_battery, v.avg_battery, '%', batColor(v.avg_battery)],
        ['AVG TMP', v.avg_temp / 50 * 100, v.avg_temp, '°C', v.avg_temp > 35 ? 'var(--red)' : 'var(--orange)']
       ].map(([lbl, fill, val, unit, col]) => (
        <div className="sum-row" key={lbl}>
          <div className="sum-lbl">{lbl}</div>
          <div className="sum-bg"><div className="sum-fill" style={{ width: `${Math.min(fill, 100)}%`, background: col }} /></div>
          <div className="sum-val">{val}{unit}</div>
        </div>
      ))}
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--dim)', marginTop: 2 }}>
        {v.readings} readings · min {v.min_battery}% · max {v.max_battery}% · peak {v.max_temp}°C
      </div>
    </div>
  ));
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Live Map', 'Analytics', 'Prediction', 'Alerts'];

export default function App() {
  const [tab, setTab]       = useState(0);
  const [vehicle, setVehicle] = useState('EV001');
  const [clock, setClock]   = useState('');

  const analytics = usePoll(`${API}/fleet/analytics`);
  const status    = usePoll(`${API}/vehicles/status`);
  const delivery  = usePoll(`${API}/fleet/delivery_plan`);
  const route     = usePoll(`${API}/fleet/route_optimization`);
  const history   = usePoll(`${API}/vehicles/history/${vehicle}`);
  const alerts    = usePoll(`${API}/fleet/alerts`);
  const summary   = usePoll(`${API}/fleet/summary`);
  const mapData   = usePoll(`${API}/fleet/map_data`);

  useEffect(() => { const t = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000); return () => clearInterval(t); }, []);

  const histSorted = history ? [...history].reverse() : [];
  const histLabels = histSorted.map((h, i) => i % 5 === 0 ? new Date(h.timestamp).toLocaleTimeString() : '');

  const batChart = { labels: histLabels, datasets: [{ label: 'Battery %', data: histSorted.map(h => h.battery_percent), borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,.07)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5 }] };
  const tmpChart = { labels: histLabels, datasets: [{ label: 'Temp °C', data: histSorted.map(h => h.temperature), borderColor: '#ff7043', backgroundColor: 'rgba(255,112,67,.07)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5 }] };

  const compChart = summary ? {
    labels: summary.map(v => v.vehicle_id),
    datasets: [{ label: 'Avg Battery', data: summary.map(v => v.avg_battery), backgroundColor: summary.map(v => batColor(v.avg_battery) + '99'), borderColor: summary.map(v => batColor(v.avg_battery)), borderWidth: 1.5, borderRadius: 3 }]
  } : null;

  const critCount = alerts?.filter(a => a.level === 'critical').length ?? 0;

  return (
    <>
      <style>{css}</style>

      {/* TOPBAR */}
      <div className="topbar">
        <div className="brand">
          <div className="brand-icon">⚡</div>
          <div>
            <div className="brand-name">EV FLEET COMMAND</div>
            <div className="brand-sub">Smart Logistics Operations · San Francisco</div>
          </div>
        </div>
        <div className="topbar-right">
          {critCount > 0 && <span className="badge b-crit" style={{ cursor: 'pointer' }} onClick={() => setTab(4)}>🚨 {critCount} CRITICAL</span>}
          <div className="live-pill"><span className="live-dot" />LIVE</div>
          <div className="clock">{clock}</div>
        </div>
      </div>

      {/* TABS */}
      <div className="tabs">
        {TABS.map((t, i) => (
          <div key={t} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
            {i === 4 && alerts?.length > 0 ? `${t} (${alerts.length})` : t}
          </div>
        ))}
      </div>

      {/* ── TAB 0: OVERVIEW ── */}
      <div className={`page ${tab === 0 ? 'show' : ''}`}>
        <div className="r4">
          <StatCard icon="🔋" label="Fleet Battery" value={analytics?.avg_battery?.toFixed(1)} unit="PERCENT AVG" color="var(--cyan)" fill={analytics?.avg_battery} />
          <StatCard icon="🌡️" label="Avg Temperature" value={analytics?.avg_temperature?.toFixed(1)} unit="CELSIUS" color="var(--orange)" fill={(analytics?.avg_temperature ?? 0) / 50 * 100} />
          <StatCard icon="🚐" label="Active Vehicles" value={analytics?.active_vehicles} unit="ONLINE" color="var(--green)" fill={(analytics?.active_vehicles ?? 0) / 3 * 100} />
          <StatCard icon="🚨" label="Active Alerts" value={alerts?.length ?? '—'} unit="INCIDENTS" color={critCount > 0 ? 'var(--red)' : 'var(--green)'} fill={(alerts?.length ?? 0) / 6 * 100} trend={critCount > 0 ? `${critCount} CRITICAL` : '✓ ALL CLEAR'} trendColor={critCount > 0 ? 'var(--red)' : 'var(--green)'} />
        </div>

        <div className="r31">
          <div className="card">
            <div className="ch"><span className="ct">Live Vehicle Status</span><span className="cm">AUTO-REFRESH 10s</span></div>
            {!status ? <div className="loading">AWAITING TELEMETRY…</div> : (
              <table>
                <thead><tr><th>Vehicle</th><th>Battery</th><th>Temperature</th><th>GPS</th><th>Updated</th></tr></thead>
                <tbody>{status.map(v => (
                  <tr key={v.vehicle_id}>
                    <td><span className="badge b-info">{v.vehicle_id}</span></td>
                    <td>
                      <span className={`badge ${batBadge(v.battery_percent)}`}>{v.battery_percent?.toFixed(1)}%</span>
                      <div className="bat-bar" style={{ width: 80 }}>
                        <div className="bat-fill" style={{ width: `${v.battery_percent}%`, background: batColor(v.battery_percent) }} />
                      </div>
                    </td>
                    <td style={{ color: 'var(--orange)' }}>{v.temperature?.toFixed(1)}°C</td>
                    <td><span className="coord">{v.lat?.toFixed(4)}, {v.lon?.toFixed(4)}</span></td>
                    <td><span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)' }}>{v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : '—'}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>

          <div className="card">
            <div className="ch"><span className="ct">Route Alerts</span></div>
            <div className="cb">
              {!route ? <div className="loading">…</div> :
                route.length === 0 ? <div className="empty">✓ All vehicles<br/>operating normally</div> :
                route.map(r => (
                  <div key={r.vehicle_id} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="badge b-info">{r.vehicle_id}</span>
                      <span className={`badge ${batBadge(r.battery_percent)}`}>{r.battery_percent}%</span>
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)' }}>→ {r.recommended_station}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)' }}>{r.distance_km} km away</div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        <div className="card">
          <div className="ch"><span className="ct">Delivery Plan</span><span className="cm">OPTIMIZED ROUTING</span></div>
          {!delivery ? <div className="loading">PLANNING…</div> : (
            <table>
              <thead><tr><th>Vehicle</th><th>Battery</th><th>Destination</th><th>Charging Stop Required</th></tr></thead>
              <tbody>{delivery.map(d => (
                <tr key={d.vehicle_id}>
                  <td><span className="badge b-info">{d.vehicle_id}</span></td>
                  <td><span className={`badge ${batBadge(d.battery_percent)}`}>{d.battery_percent}%</span></td>
                  <td style={{ color: 'var(--purple)' }}>{d.destination}</td>
                  <td>{d.charging_stop ? <span className="badge b-warn">⚡ {d.charging_stop}</span> : <span className="badge b-ok">✓ Direct route</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── TAB 1: LIVE MAP ── */}
      <div className={`page ${tab === 1 ? 'show' : ''}`}>
        <div className="card">
          <div className="ch"><span className="ct">Fleet Position Map</span><span className="cm">REAL-TIME GPS · SAN FRANCISCO BAY AREA</span></div>
          <div className="cb"><FleetMap mapData={mapData} /></div>
        </div>
        <div className="r3">
          {(mapData?.vehicles || []).map(v => (
            <div className="card" key={v.vehicle_id}>
              <div className="ch">
                <span className="ct">{v.vehicle_id}</span>
                <span className={`badge ${batBadge(v.battery_percent)}`}>{v.battery_percent?.toFixed(1)}%</span>
              </div>
              <div className="cb">
                <div className="sum-row">
                  <div className="sum-lbl">BATTERY</div>
                  <div className="sum-bg"><div className="sum-fill" style={{ width: `${v.battery_percent}%`, background: batColor(v.battery_percent) }} /></div>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', marginTop: 8, lineHeight: 1.8 }}>
                  📍 {v.lat?.toFixed(5)}, {v.lon?.toFixed(5)}<br />
                  🌡️ {v.temperature?.toFixed(1)}°C<br />
                  🕐 {v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TAB 2: ANALYTICS ── */}
      <div className={`page ${tab === 2 ? 'show' : ''}`}>
        <div className="card">
          <div className="ch">
            <span className="ct">Vehicle Telemetry History</span>
            <div className="vsrow">
              {['EV001','EV002','EV003'].map(v => (
                <button key={v} className={`vsbtn ${vehicle === v ? 'vsel' : ''}`} onClick={() => setVehicle(v)}>{v}</button>
              ))}
            </div>
          </div>
          <div className="cb">
            <div className="r2">
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--dim)', letterSpacing: 2, marginBottom: 8 }}>BATTERY % — {vehicle}</div>
                <div style={{ position: 'relative', height: 200 }}>
                  {histSorted.length > 0 ? <Line data={batChart} options={{ ...CHART_OPTS, scales: { ...CHART_OPTS.scales, y: { ...CHART_OPTS.scales.y, min: 0, max: 100 } } }} /> : <div className="loading">NO DATA</div>}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--dim)', letterSpacing: 2, marginBottom: 8 }}>TEMPERATURE °C — {vehicle}</div>
                <div style={{ position: 'relative', height: 200 }}>
                  {histSorted.length > 0 ? <Line data={tmpChart} options={CHART_OPTS} /> : <div className="loading">NO DATA</div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="r2">
          <div className="card">
            <div className="ch"><span className="ct">Fleet Summary Stats</span><span className="cm">ALL VEHICLES</span></div>
            <div className="cb"><SummaryBars summary={summary} /></div>
          </div>
          <div className="card">
            <div className="ch"><span className="ct">Battery Comparison</span><span className="cm">CURRENT LEVELS</span></div>
            <div className="cb">
              {compChart && (
                <div style={{ position: 'relative', height: 160 }}>
                  <Bar data={compChart} options={{ ...CHART_OPTS, scales: { ...CHART_OPTS.scales, y: { ...CHART_OPTS.scales.y, min: 0, max: 100 } } }} />
                </div>
              )}
              {summary && (
                <table style={{ marginTop: 14 }}>
                  <thead><tr><th>Vehicle</th><th>Min</th><th>Max</th><th>Readings</th><th>Peak Temp</th></tr></thead>
                  <tbody>{summary.map(v => (
                    <tr key={v.vehicle_id}>
                      <td><span className="badge b-info">{v.vehicle_id}</span></td>
                      <td style={{ color: 'var(--red)' }}>{v.min_battery}%</td>
                      <td style={{ color: 'var(--green)' }}>{v.max_battery}%</td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--dim)' }}>{v.readings}</td>
                      <td style={{ color: v.max_temp > 35 ? 'var(--red)' : 'var(--orange)' }}>{v.max_temp}°C</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB 3: PREDICTION ── */}
      <div className={`page ${tab === 3 ? 'show' : ''}`}>
        <div className="card">
          <div className="ch">
            <span className="ct">Battery Prediction — NumPy Linear Regression</span>
            <div className="vsrow">
              {['EV001','EV002','EV003'].map(v => (
                <button key={v} className={`vsbtn ${vehicle === v ? 'vsel' : ''}`} onClick={() => setVehicle(v)}>{v}</button>
              ))}
            </div>
          </div>
          <div className="cb"><PredictionChart vehicleId={vehicle} key={vehicle} /></div>
        </div>

        <div className="r3">
          {['EV001','EV002','EV003'].map(vid => <MiniPredCard key={vid} vehicleId={vid} />)}
        </div>

        <div className="card">
          <div className="ch"><span className="ct">How Prediction Works</span><span className="cm">ALGORITHM REFERENCE</span></div>
          <div className="cb" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', lineHeight: 1.9 }}>
            <div style={{ color: 'var(--cyan)', marginBottom: 8 }}>numpy.polyfit(x, battery_values, degree=1)</div>
            1. Fetch last 40 telemetry readings from PostgreSQL<br />
            2. Fit a degree-1 polynomial (linear) using NumPy least-squares regression<br />
            3. Extrapolate the next 12 data points (~60 seconds ahead)<br />
            4. Clip predictions to [0, 100] valid battery range<br />
            5. Classify trend: slope &lt; -0.2 = draining · |slope| ≤ 0.2 = stable · slope &gt; 0.2 = charging
          </div>
        </div>
      </div>

      {/* ── TAB 4: ALERTS ── */}
      <div className={`page ${tab === 4 ? 'show' : ''}`}>
        <div className="r4">
          <StatCard icon="🚨" label="Critical" value={alerts?.filter(a => a.level === 'critical').length ?? '—'} unit="INCIDENTS" color="var(--red)" fill={(alerts?.filter(a => a.level === 'critical').length ?? 0) / 6 * 100} />
          <StatCard icon="⚠️" label="Warnings" value={alerts?.filter(a => a.level === 'warning').length ?? '—'} unit="INCIDENTS" color="var(--yellow)" fill={(alerts?.filter(a => a.level === 'warning').length ?? 0) / 6 * 100} />
          <StatCard icon="🔋" label="Battery Issues" value={alerts?.filter(a => a.type === 'battery').length ?? '—'} unit="VEHICLES" color="var(--orange)" fill={(alerts?.filter(a => a.type === 'battery').length ?? 0) / 3 * 100} />
          <StatCard icon="🌡️" label="Temp Issues" value={alerts?.filter(a => a.type === 'temperature').length ?? '—'} unit="VEHICLES" color="var(--purple)" fill={(alerts?.filter(a => a.type === 'temperature').length ?? 0) / 3 * 100} />
        </div>

        <div className="r2">
          <div className="card">
            <div className="ch"><span className="ct">Active Alerts</span><span className="cm">{alerts?.length ?? 0} TOTAL</span></div>
            <div className="cb">
              {!alerts ? <div className="loading">SCANNING…</div> :
                alerts.length === 0 ? <div className="empty">✓ No active alerts — all systems nominal</div> :
                alerts.map((a, i) => (
                  <div key={i} className={`alert-item ${a.level === 'critical' ? 'a-crit' : 'a-warn'}`}>
                    <div style={{ fontSize: 16, marginTop: 1 }}>{a.type === 'battery' ? '🔋' : a.type === 'temperature' ? '🌡️' : '📡'}</div>
                    <div>
                      <div className="alert-vid">{a.vehicle_id}&nbsp;·&nbsp;<span className={`badge ${a.level === 'critical' ? 'b-crit' : 'b-warn'}`}>{a.level.toUpperCase()}</span></div>
                      <div className="alert-msg">{a.message}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="card">
            <div className="ch"><span className="ct">Delivery & Charge Status</span></div>
            <div className="cb">
              {!delivery ? <div className="loading">…</div> : delivery.map(d => (
                <div key={d.vehicle_id} className={`alert-item ${d.charging_stop ? 'a-warn' : 'a-ok'}`}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                      <span className="badge b-info">{d.vehicle_id}</span>
                      <span className={`badge ${batBadge(d.battery_percent)}`}>{d.battery_percent}%</span>
                    </div>
                    <div style={{ fontSize: 13 }}>📦 {d.destination}</div>
                    {d.charging_stop
                      ? <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--yellow)', marginTop: 2 }}>⚡ Required stop: {d.charging_stop}</div>
                      : <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)', marginTop: 2 }}>✓ Direct delivery — sufficient charge</div>
                    }
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

function MiniPredCard({ vehicleId }) {
  const [pred, setPred] = useState(null);
  const doFetch = useCallback(() => {
    fetch(`${API}/vehicles/predict_series/${vehicleId}?steps=6`)
      .then(r => r.json()).then(j => j.status === 'success' && setPred(j.data)).catch(() => {});
  }, [vehicleId]);
  useInterval(doFetch, 10000);

  const tC = { charging: 'var(--green)', stable: 'var(--yellow)', draining: 'var(--red)' };
  const curr = pred?.historical?.[pred.historical.length - 1];
  const next = pred?.predicted?.[0];
  const last = pred?.predicted?.[pred.predicted.length - 1];

  return (
    <div className="card">
      <div className="ch">
        <span className="ct">{vehicleId}</span>
        {pred && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: tC[pred.trend] }}>{pred.trend?.toUpperCase()}</span>}
      </div>
      <div className="cb">
        {!pred ? <div className="loading">…</div> : (
          <>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--dim)', marginBottom: 6 }}>CURRENT</div>
            <div style={{ fontFamily: 'var(--head)', fontWeight: 800, fontSize: 36, color: batColor(curr ?? 50), marginBottom: 8 }}>{curr?.toFixed(1)}%</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)' }}>Next reading: <span style={{ color: 'var(--yellow)' }}>{next?.toFixed(1)}%</span></div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>In ~30s: <span style={{ color: 'var(--yellow)' }}>{last?.toFixed(1)}%</span></div>
          </>
        )}
      </div>
    </div>
  );
}
