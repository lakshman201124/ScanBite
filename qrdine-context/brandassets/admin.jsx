/* global React */
// ScanBite — Admin desktop screens (3 screens)
// Designed for 1280x800 surface inside DC artboards.

const ADM_IMG = {
  burger:  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&auto=format',
  pasta:   'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&q=80&auto=format',
  salad:   'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80&auto=format',
  pizza:   'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80&auto=format',
  ramen:   'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80&auto=format',
  tacos:   'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80&auto=format',
  steak:   'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=600&q=80&auto=format',
  poke:    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80&auto=format',
  dessert: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&q=80&auto=format',
  coffee:  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80&auto=format',
  avocado: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80&auto=format',
  wings:   'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80&auto=format',
  av1:     'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80&auto=format',
  av2:     'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=120&q=80&auto=format',
  av3:     'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=80&auto=format',
  av4:     'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80&auto=format',
  av5:     'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&q=80&auto=format',
  av6:     'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&q=80&auto=format',
};

const A = {
  logo: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h2V5h2v2h2"/><path d="M14 7h2V5h2v2h2"/><path d="M4 12h16"/><path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/></svg>,
  dash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  orders: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v18l3-2 3 2 3-2 3 2 3-2V3"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>,
  menu: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>,
  kds: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M7 21h10M12 17v4"/></svg>,
  qr: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3M14 21h3v0"/></svg>,
  table: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h16l-1 4H5z"/><path d="M6 13v7M18 13v7"/></svg>,
  chart: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 3 5-7"/></svg>,
  users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  cog: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.6.25 1 .84 1 1.51H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  rupee: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12M6 8h12M16 13H6c5 0 7 4 12 8"/></svg>,
  up: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 15 6-6 6 6"/></svg>,
  dn: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>,
  more: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-11"/></svg>,
  bag: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 7h12l-1 13H7L6 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>,
  clock: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  note:  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>,
  print: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>,
  flame: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s4 5 4 9a4 4 0 0 1-8 0c0-1 .5-2 .5-2S6 11 6 14a6 6 0 1 0 12 0c0-6-6-12-6-12Z"/></svg>,
};

// ─────────────────────────────────────────────────────────────
// Shared sidebar
// ─────────────────────────────────────────────────────────────
function Sidebar({ active }) {
  const main = [
    { id: 'dash',   label: 'Dashboard',  ico: A.dash },
    { id: 'orders', label: 'Orders',     ico: A.orders, badge: '12' },
    { id: 'kds',    label: 'Kitchen (KDS)', ico: A.kds },
    { id: 'menu',   label: 'Menu',       ico: A.menu },
  ];
  const ops = [
    { id: 'tables', label: 'Tables & QR', ico: A.qr },
    { id: 'analytics', label: 'Analytics', ico: A.chart },
    { id: 'staff', label: 'Staff', ico: A.users },
    { id: 'settings', label: 'Settings', ico: A.cog },
  ];

  return (
    <aside className="adm-side">
      <div className="adm-logo">
        <div className="adm-logo__mark">{A.logo}</div>
        <div>
          <div className="adm-logo__name">Scan<span>Bite</span></div>
          <div style={{ font: '500 10px var(--sans)', color: 'var(--muted)' }}>Olio Trattoria · Premium</div>
        </div>
      </div>

      <div className="adm-nav-label">Operate</div>
      {main.map((n) => (
        <div key={n.id} className={'adm-nav' + (n.id === active ? ' is-active' : '')}>
          {n.ico}<span>{n.label}</span>
          {n.badge && n.id !== active && <span className="adm-nav__b">{n.badge}</span>}
        </div>
      ))}

      <div className="adm-nav-label">Manage</div>
      {ops.map((n) => (
        <div key={n.id} className={'adm-nav' + (n.id === active ? ' is-active' : '')}>
          {n.ico}<span>{n.label}</span>
        </div>
      ))}

      <div className="adm-user">
        <div className="adm-user__avatar" style={{ backgroundImage: `url(${ADM_IMG.av1})` }}></div>
        <div style={{ flex: 1 }}>
          <div className="adm-user__name">Priya Shah</div>
          <div className="adm-user__role">Owner · Admin</div>
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// 1) DASHBOARD — overview / KPIs / charts / live orders
// ─────────────────────────────────────────────────────────────
function ScreenDashboard() {
  // Synthetic revenue path for sparkline + area chart
  const points = [22, 18, 28, 34, 31, 42, 48, 44, 56, 62, 58, 70, 68, 78, 86, 82];
  const w = 700, h = 200, pad = 8;
  const max = Math.max(...points);
  const step = (w - pad*2) / (points.length - 1);
  const linePath = points.map((p, i) => {
    const x = pad + i * step;
    const y = h - pad - (p / max) * (h - pad*2 - 16);
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  const areaPath = linePath + ` L${(w-pad).toFixed(1)},${(h-pad).toFixed(1)} L${pad.toFixed(1)},${(h-pad).toFixed(1)} Z`;

  // Donut data (5% / 30% / 65%)
  const donut = [
    { lbl: 'Dine-in',  val: 65, color: '#FF4D3D' },
    { lbl: 'Takeaway', val: 24, color: '#FFB838' },
    { lbl: 'Delivery', val: 11, color: '#2A2933' },
  ];
  const C = 2 * Math.PI * 50; // radius 50
  let cum = 0;

  const orders = [
    { id: 'ORD-0042', name: 'Aanya R.', av: ADM_IMG.av1, table: 'T-12', items: '3 items · ₹1,159', time: '4 min ago', status: 'new',       label: 'New' },
    { id: 'ORD-0041', name: 'Rohan M.', av: ADM_IMG.av2, table: 'T-04', items: '2 items · ₹680',   time: '7 min ago', status: 'preparing', label: 'Preparing' },
    { id: 'ORD-0040', name: 'Lia K.',   av: ADM_IMG.av3, table: 'T-07', items: '4 items · ₹1,820', time: '12 min ago',status: 'ready',     label: 'Ready' },
    { id: 'ORD-0039', name: 'Anika D.', av: ADM_IMG.av4, table: 'T-02', items: '1 item · ₹420',    time: '18 min ago',status: 'served',    label: 'Served' },
    { id: 'ORD-0038', name: 'Karan T.', av: ADM_IMG.av5, table: 'T-09', items: '5 items · ₹2,240', time: '24 min ago',status: 'preparing', label: 'Preparing' },
  ];

  const topItems = [
    { img: ADM_IMG.burger, name: 'Smash Beef Stack', cat: 'Burgers',  qty: 142, rev: '₹45,440' },
    { img: ADM_IMG.ramen,  name: 'Tonkotsu Ramen',   cat: 'Asian',    qty: 98,  rev: '₹41,160' },
    { img: ADM_IMG.salad,  name: 'Burrata Caprese',  cat: 'Starters', qty: 76,  rev: '₹28,880' },
    { img: ADM_IMG.pasta,  name: 'Truffle Carbonara',cat: 'Pasta',    qty: 71,  rev: '₹32,660' },
  ];

  return (
    <div className="admin">
      <Sidebar active="dash" />

      <main className="adm-main">
        <header className="adm-top">
          <div>
            <h1>Tonight's service</h1>
            <div className="adm-top__sub">Friday · Mar 14, 2026 · 7:48 PM</div>
          </div>
          <div className="adm-top__spacer"></div>
          <div className="adm-search">{A.search}<input placeholder="Search orders, dishes, tables…" /></div>
          <div className="adm-icon-btn">{A.bell}<span className="dot"></span></div>
          <button style={{ background: 'var(--brand)', color: '#fff', border: 0, padding: '9px 16px', borderRadius: 10, font: '700 13px var(--sans)', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: 'var(--sh-coral)' }}>
            {A.plus} New order
          </button>
        </header>

        <div className="adm-body">
          {/* KPIs */}
          <div className="kpi-grid">
            <div className="kpi feature">
              <div className="kpi__label">
                <span className="ico">{A.rupee}</span>
                Tonight's revenue
              </div>
              <div className="kpi__val">₹84,260</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__delta">{A.up} 18.4%</span>
                <span style={{ font: '500 11px var(--sans)', color: 'rgba(255,255,255,.55)' }}>vs last Fri</span>
              </div>
            </div>
            <div className="kpi">
              <div className="kpi__label"><span className="ico">{A.bag}</span> Orders</div>
              <div className="kpi__val">142</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__delta">{A.up} 12.0%</span>
                <span style={{ font: '500 11px var(--sans)', color: 'var(--muted)' }}>14 active</span>
              </div>
            </div>
            <div className="kpi">
              <div className="kpi__label"><span className="ico">{A.clock}</span> Avg prep time</div>
              <div className="kpi__val">14<span style={{ font: '600 14px var(--sans)', color: 'var(--muted)', marginLeft: 4 }}>min</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__delta dn">{A.dn} 2 min</span>
                <span style={{ font: '500 11px var(--sans)', color: 'var(--muted)' }}>under target</span>
              </div>
            </div>
            <div className="kpi">
              <div className="kpi__label"><span className="ico">{A.table}</span> Tables seated</div>
              <div className="kpi__val">14<span style={{ font: '600 14px var(--sans)', color: 'var(--muted)', marginLeft: 4 }}>/ 22</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__delta">64% full</span>
                <span style={{ font: '500 11px var(--sans)', color: 'var(--muted)' }}>3 waiting</span>
              </div>
            </div>
          </div>

          {/* Main grid */}
          <div style={{ height: 16 }}></div>
          <div className="grid-2">
            <div className="col-stack">
              {/* Revenue chart */}
              <div className="card">
                <div className="card__h">
                  <div>
                    <h3>Revenue · Today</h3>
                    <div style={{ font: '500 12px var(--sans)', color: 'var(--muted)', marginTop: 2 }}>
                      Hourly · resets at 4 AM
                    </div>
                  </div>
                  <div className="seg">
                    <button>1D</button>
                    <button className="is-on">Today</button>
                    <button>7D</button>
                    <button>30D</button>
                  </div>
                </div>
                <div className="chart-wrap">
                  <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor="#FF4D3D" stopOpacity="0.32"/>
                        <stop offset="1" stopColor="#FF4D3D" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {[0,1,2,3].map((i) => (
                      <line key={i} x1="0" x2={w} y1={pad + i*(h-pad*2)/3} y2={pad + i*(h-pad*2)/3} stroke="rgba(20,19,26,0.05)" strokeDasharray="3 4"/>
                    ))}
                    <path d={areaPath} fill="url(#area)"/>
                    <path d={linePath} fill="none" stroke="#FF4D3D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    {points.map((p, i) => {
                      const x = pad + i*step;
                      const y = h - pad - (p/max)*(h-pad*2-16);
                      return i === 13 ? (
                        <g key={i}>
                          <circle cx={x} cy={y} r="6" fill="#fff" stroke="#FF4D3D" strokeWidth="3"/>
                          <g transform={`translate(${x - 38}, ${y - 44})`}>
                            <rect x="0" y="0" width="76" height="28" rx="8" fill="#14131A"/>
                            <text x="38" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Plus Jakarta Sans">7:00 PM</text>
                            <text x="38" y="23" textAnchor="middle" fill="#FF9385" fontSize="10" fontWeight="600" fontFamily="Plus Jakarta Sans">₹12,420</text>
                          </g>
                        </g>
                      ) : null;
                    })}
                  </svg>
                </div>
                <div style={{ display: 'flex', gap: 28, marginTop: 14 }}>
                  <div>
                    <div style={{ font: '600 11px var(--sans)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Total</div>
                    <div style={{ font: '800 22px var(--sans)', letterSpacing: '-.02em' }}>₹84,260</div>
                  </div>
                  <div>
                    <div style={{ font: '600 11px var(--sans)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Avg ticket</div>
                    <div style={{ font: '800 22px var(--sans)', letterSpacing: '-.02em' }}>₹594</div>
                  </div>
                  <div>
                    <div style={{ font: '600 11px var(--sans)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Top hour</div>
                    <div style={{ font: '800 22px var(--sans)', letterSpacing: '-.02em' }}>8 PM</div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: '#FF4D3D' }}></span>
                    <span style={{ font: '600 12px var(--sans)' }}>This Friday</span>
                  </div>
                </div>
              </div>

              {/* Live orders */}
              <div className="card">
                <div className="card__h">
                  <div>
                    <h3>Live orders</h3>
                    <div style={{ font: '500 12px var(--sans)', color: 'var(--muted)', marginTop: 2 }}>Real-time · auto-refreshes</div>
                  </div>
                  <a href="#" style={{ font: '600 12px var(--sans)', color: 'var(--brand)', textDecoration: 'none' }}>View all →</a>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px 90px 110px 36px', gap: 12, padding: '0 6px 8px', font: '600 10px var(--sans)', color: 'var(--muted-2)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                  <div>Order</div><div>Customer</div><div>Table</div><div>Items</div><div>Status</div><div></div>
                </div>
                {orders.map((o) => (
                  <div key={o.id} className="order-row">
                    <div className="order-row__id">{o.id}</div>
                    <div className="order-row__cust">
                      <div className="order-row__avatar" style={{ backgroundImage: `url(${o.av})` }}></div>
                      <div>
                        <div className="order-row__name">{o.name}</div>
                        <div className="order-row__time">{o.time}</div>
                      </div>
                    </div>
                    <div style={{ font: '700 12px var(--sans)' }}>{o.table}</div>
                    <div style={{ font: '500 12px var(--sans)', color: 'var(--muted)' }}>{o.items}</div>
                    <div>
                      <span className={'status-pill ' + o.status}>
                        <span className="dot"></span>{o.label}
                      </span>
                    </div>
                    <div className="adm-icon-btn" style={{ width: 30, height: 30, borderRadius: 8 }}>{A.more}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column */}
            <div className="col-stack">
              {/* Order mix */}
              <div className="card">
                <div className="card__h">
                  <h3>Order mix</h3>
                  <button className="adm-icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }}>{A.more}</button>
                </div>
                <div className="donut-wrap">
                  <svg width="140" height="140" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#F2EEE8" strokeWidth="14"/>
                    {donut.map((d, i) => {
                      const len = (d.val / 100) * C;
                      const off = -cum;
                      cum += len;
                      return (
                        <circle key={i} cx="60" cy="60" r="50" fill="none"
                          stroke={d.color} strokeWidth="14"
                          strokeDasharray={`${len} ${C}`}
                          strokeDashoffset={off}
                          transform="rotate(-90 60 60)"
                          strokeLinecap="round"/>
                      );
                    })}
                  </svg>
                  <div className="donut-center">
                    <div>
                      <div className="donut-center__v">142</div>
                      <div className="donut-center__l">Orders</div>
                    </div>
                  </div>
                </div>
                <div className="legend" style={{ marginTop: 18 }}>
                  {donut.map((d) => (
                    <div key={d.lbl} className="legend__row">
                      <span className="sw" style={{ background: d.color }}></span>
                      {d.lbl}
                      <span className="val">{d.val}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top selling */}
              <div className="card">
                <div className="card__h">
                  <h3>Top sellers</h3>
                  <a href="#" style={{ font: '600 12px var(--sans)', color: 'var(--brand)', textDecoration: 'none' }}>Menu →</a>
                </div>
                {topItems.map((it, i) => (
                  <div key={it.name} className="top-item">
                    <div className="top-item__img" style={{ backgroundImage: `url(${it.img})` }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="top-item__name">
                        <span style={{ color: 'var(--muted-2)', marginRight: 6 }}>#{i+1}</span>
                        {it.name}
                      </div>
                      <div className="top-item__cat">{it.cat}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="top-item__qty">{it.qty}</div>
                      <div className="top-item__rev">{it.rev}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2) KDS — Kitchen display view
// ─────────────────────────────────────────────────────────────
function ScreenKDS() {
  const cards = [
    {
      table: 'T-12', order: 'ORD-0042', time: 4, urgency: 'fresh',
      items: [
        { qty: 2, name: 'Smash Beef Stack', opts: 'Med-Well · +Cheese, Bacon', done: true },
        { qty: 1, name: 'Tonkotsu Ramen',    opts: 'Extra noodles · No nori', done: false },
        { qty: 1, name: 'Burrata Caprese',   opts: 'Heirloom tomatoes',        done: false },
      ],
      note: 'Birthday — bring dessert with candle',
    },
    {
      table: 'T-04', order: 'ORD-0041', time: 12, urgency: 'warn',
      items: [
        { qty: 1, name: 'Truffle Carbonara', opts: 'Veg · Extra parmesan', done: true },
        { qty: 1, name: 'Sourdough Pizza',   opts: 'Margherita · Spicy oil', done: false },
      ],
      note: '',
    },
    {
      table: 'T-09', order: 'ORD-0038', time: 22, urgency: 'crit',
      items: [
        { qty: 2, name: 'Smash Beef Stack', opts: 'Medium',                done: true },
        { qty: 1, name: 'Loaded Wings',     opts: 'Spicy · Buffalo sauce', done: true },
        { qty: 1, name: 'Salmon Poke Bowl', opts: 'No avocado',            done: false },
        { qty: 1, name: 'Tiramisu',         opts: 'For after mains',       done: false },
      ],
      note: 'Allergy: shellfish — separate prep board',
    },
    {
      table: 'T-07', order: 'ORD-0040', time: 6, urgency: 'fresh',
      items: [
        { qty: 4, name: 'Soft Tacos', opts: 'Mix — pulled pork, fish', done: false },
        { qty: 2, name: 'Iced Latte', opts: 'Less sugar',              done: true },
      ],
      note: '',
    },
    {
      table: 'T-02', order: 'ORD-0039', time: 9, urgency: 'fresh',
      items: [
        { qty: 1, name: 'Steak Frites', opts: 'Med-Rare · Peppercorn', done: false },
      ],
      note: 'Steak should be plated last',
    },
    {
      table: 'T-15', order: 'ORD-0037', time: 17, urgency: 'warn',
      items: [
        { qty: 1, name: 'Sourdough Pizza', opts: 'Pepperoni · Extra cheese', done: true },
        { qty: 1, name: 'Avocado Toast',   opts: 'Add poached egg',          done: true },
        { qty: 1, name: 'Iced Latte',      opts: 'Almond milk',              done: false },
      ],
      note: '',
    },
  ];

  return (
    <div className="admin">
      <Sidebar active="kds" />
      <main className="adm-main">
        <header className="adm-top">
          <div>
            <h1>Kitchen display</h1>
            <div className="adm-top__sub">Marco's station · 6 active · 1 critical</div>
          </div>
          <div className="adm-top__spacer"></div>
          <div className="adm-search" style={{ width: 200 }}>{A.search}<input placeholder="Filter orders…" /></div>
          <div className="adm-icon-btn">{A.print}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--green-soft)', color: 'var(--green)', borderRadius: 10, font: '700 12px var(--sans)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--green)', boxShadow: '0 0 0 4px rgba(30,158,94,.15)' }}></span>
            Sound on
          </div>
        </header>

        <div className="adm-body">
          {/* Status counts */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <div className="adm-cat is-active"><span>All active</span><span className="cnt">6</span></div>
            <div className="adm-cat" style={{ borderColor: 'var(--green)', color: 'var(--green)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: 'currentColor' }}></span>
              <span>Fresh</span><span className="cnt" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>3</span>
            </div>
            <div className="adm-cat" style={{ borderColor: 'var(--amber)', color: '#8a5b00' }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--amber)' }}></span>
              <span>Approaching late</span><span className="cnt" style={{ background: 'var(--amber-soft)', color: '#8a5b00' }}>2</span>
            </div>
            <div className="adm-cat" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--red)' }}></span>
              <span>Overdue</span><span className="cnt" style={{ background: 'rgba(224,58,48,.12)', color: 'var(--red)' }}>1</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, font: '500 12px var(--sans)', color: 'var(--muted)' }}>
              {A.clock} Auto-refresh · 5s
            </div>
          </div>

          <div className="kds-grid">
            {cards.map((c) => (
              <div key={c.order} className={'kds ' + c.urgency}>
                <div className="kds__h">
                  <div>
                    <div className="kds__table">Table {c.table}</div>
                    <div className="kds__order">{c.order} · {c.items.reduce((a,i)=>a+i.qty,0)} items</div>
                  </div>
                  <div className="kds__timer">
                    {A.clock} {c.time}m
                  </div>
                </div>
                <div className="kds__items">
                  {c.items.map((it, i) => (
                    <div key={i} className="kds__item">
                      <div className="kds__qty">×{it.qty}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="kds__name">{it.name}</p>
                        <p className="kds__opts">{it.opts}</p>
                      </div>
                      <div className={'kds__chk' + (it.done ? ' is-on' : '')}>
                        {it.done && A.check}
                      </div>
                    </div>
                  ))}
                  {c.note && (
                    <div style={{ padding: '6px 0 12px' }}>
                      <div className="kds__note">{A.note} {c.note}</div>
                    </div>
                  )}
                </div>
                <div className="kds__foot">
                  <button className="kds__btn">+ Note</button>
                  {c.urgency === 'crit' ? (
                    <button className="kds__btn dark">All ready →</button>
                  ) : (
                    <button className="kds__btn primary">All ready →</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3) MENU MANAGER
// ─────────────────────────────────────────────────────────────
function ScreenMenuManager() {
  const cats = [
    { name: 'All',        count: 86, active: true },
    { name: 'Starters',   count: 14 },
    { name: 'Burgers',    count: 8,  active: false, hot: true },
    { name: 'Pasta',      count: 12 },
    { name: 'Pizza',      count: 9 },
    { name: 'Asian',      count: 11 },
    { name: 'Bowls',      count: 7 },
    { name: 'Desserts',   count: 10 },
    { name: 'Drinks',     count: 15 },
  ];
  const items = [
    { img: ADM_IMG.burger,  name: 'Smash Beef Stack',   cat: 'Burgers',  price: 320, on: true,  veg: false, badge: 'Bestseller' },
    { img: ADM_IMG.pasta,   name: 'Truffle Carbonara',  cat: 'Pasta',    price: 460, on: true,  veg: true,  badge: null },
    { img: ADM_IMG.ramen,   name: 'Tonkotsu Ramen',     cat: 'Asian',    price: 420, on: true,  veg: false, badge: 'Chef pick' },
    { img: ADM_IMG.poke,    name: 'Salmon Poke Bowl',   cat: 'Bowls',    price: 380, on: true,  veg: false, badge: null },
    { img: ADM_IMG.pizza,   name: 'Sourdough Margherita', cat: 'Pizza', price: 480, on: true,  veg: true,  badge: 'New' },
    { img: ADM_IMG.salad,   name: 'Burrata Caprese',    cat: 'Starters', price: 380, on: true,  veg: true,  badge: null },
    { img: ADM_IMG.steak,   name: 'Steak Frites',       cat: 'Mains',    price: 720, on: false, veg: false, badge: null },
    { img: ADM_IMG.dessert, name: 'Tiramisu Classic',   cat: 'Desserts', price: 240, on: true,  veg: true,  badge: 'Bestseller' },
  ];

  return (
    <div className="admin">
      <Sidebar active="menu" />
      <main className="adm-main">
        <header className="adm-top">
          <div>
            <h1>Menu</h1>
            <div className="adm-top__sub">86 dishes · 9 categories · Last synced 2 min ago</div>
          </div>
          <div className="adm-top__spacer"></div>
          <div className="adm-search">{A.search}<input placeholder="Search any dish…" /></div>
          <button style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', padding: '9px 14px', borderRadius: 10, font: '600 13px var(--sans)', color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Import CSV
          </button>
          <button style={{ background: 'var(--brand)', color: '#fff', border: 0, padding: '9px 16px', borderRadius: 10, font: '700 13px var(--sans)', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: 'var(--sh-coral)' }}>
            {A.plus} Add dish
          </button>
        </header>

        <div className="adm-body">
          {/* Quick stats strip */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 14, padding: '12px 18px', flex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--brand-tint)', color: 'var(--brand)', display: 'grid', placeItems: 'center' }}>{A.menu}</div>
              <div>
                <div style={{ font: '500 11px var(--sans)', color: 'var(--muted)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Live on menu</div>
                <div style={{ font: '800 20px var(--sans)' }}>82 <span style={{ font: '500 12px var(--sans)', color: 'var(--muted)' }}>of 86</span></div>
              </div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 14, padding: '12px 18px', flex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--green-soft)', color: 'var(--green)', display: 'grid', placeItems: 'center' }}>{A.up}</div>
              <div>
                <div style={{ font: '500 11px var(--sans)', color: 'var(--muted)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Best margin</div>
                <div style={{ font: '800 20px var(--sans)' }}>Burgers <span style={{ font: '500 12px var(--sans)', color: 'var(--green)' }}>62%</span></div>
              </div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 14, padding: '12px 18px', flex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--amber-soft)', color: '#8a5b00', display: 'grid', placeItems: 'center' }}>{A.flame}</div>
              <div>
                <div style={{ font: '500 11px var(--sans)', color: 'var(--muted)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Trending now</div>
                <div style={{ font: '800 20px var(--sans)' }}>Smash Beef <span style={{ font: '500 12px var(--sans)', color: 'var(--muted)' }}>+24%</span></div>
              </div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 14, padding: '12px 18px', flex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(46,110,247,.10)', color: 'var(--blue)', display: 'grid', placeItems: 'center' }}>{A.note}</div>
              <div>
                <div style={{ font: '500 11px var(--sans)', color: 'var(--muted)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Pending edits</div>
                <div style={{ font: '800 20px var(--sans)' }}>4 <span style={{ font: '500 12px var(--sans)', color: 'var(--muted)' }}>drafts</span></div>
              </div>
            </div>
          </div>

          {/* Cats */}
          <div className="adm-cats">
            {cats.map((c) => (
              <div key={c.name} className={'adm-cat' + (c.active ? ' is-active' : '')}>
                <span>{c.name}</span>
                <span className="cnt">{c.count}</span>
                {c.hot && <span style={{ width: 6, height: 6, borderRadius: 4, background: 'var(--brand)' }}></span>}
              </div>
            ))}
          </div>

          {/* Items grid */}
          <div className="adm-menu-grid">
            {items.map((it) => (
              <div key={it.name} className="adm-menu-card">
                <div className="adm-menu-card__img" style={{ backgroundImage: `url(${it.img})` }}>
                  {it.badge && (
                    <div className={'adm-menu-card__badge' + (it.badge === 'Bestseller' ? ' best' : '')}>{it.badge}</div>
                  )}
                  {!it.on && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,19,26,.55)', display: 'grid', placeItems: 'center', color: '#fff', font: '700 11px var(--sans)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      Hidden
                    </div>
                  )}
                </div>
                <div className="adm-menu-card__b">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={'veg-dot' + (it.veg ? '' : ' nonveg')}></span>
                    <h4 className="adm-menu-card__name">{it.name}</h4>
                  </div>
                  <div className="adm-menu-card__cat">{it.cat}</div>
                  <div className="adm-menu-card__row">
                    <div className="adm-menu-card__price">₹{it.price}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ font: '600 10px var(--sans)', color: 'var(--muted)' }}>{it.on ? 'On' : 'Off'}</div>
                      <div className={'toggle' + (it.on ? ' is-on' : '')}></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { ScreenDashboard, ScreenKDS, ScreenMenuManager });
