import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { useApp } from '../state.jsx';
import { MCLS, MED } from '../lib/constants.js';
import { Card, Dot, Empty, Icon, Select } from '../ui.jsx';

const Tally = ({ x }) => (
  <div className="mini">
    <span title="Gold">🥇 {x.g}</span><span title="Silver">🥈 {x.s}</span><span title="Bronze">🥉 {x.b}</span><span title="Wood">🪵 {x.w}</span>
  </div>
);

function Pod({ x, place }) {
  const m = Math.min(x.rank, 4);
  return (
    <div className={'pod p' + place} style={{ '--hc': x.h.color, animationDelay: (place === 1 ? 0 : place === 2 ? 0.1 : 0.2) + 's' }}>
      {place === 1 && <Icon n="crown" s={28} className="crown" />}
      <div className={'medal ' + MCLS[m]} style={{ marginTop: place === 1 ? 6 : 0 }}>{x.rank}</div>
      <h4><Dot color={x.h.color} />{x.h.name}</h4>
      <div className="pts">{x.pts}</div>
      <div className="pl">points</div>
      <div className="mc"><Tally x={x} /></div>
    </div>
  );
}

export default function Dashboard() {
  const { H, YEAR, theme, ME } = useApp();
  const [df, setDf] = useState({ cat: '', house: '', cls: '' });
  const c1 = useRef(null), c2 = useRef(null), c3 = useRef(null);

  const classes = [];
  H.yr('Students').forEach((s) => { if (s.cls && classes.indexOf(s.cls) < 0) classes.push(s.cls); });
  classes.sort();
  const st = H.standings(df);
  const tot = { pts: 0, g: 0, s: 0, b: 0, w: 0 };
  st.forEach((x) => { tot.pts += x.pts; tot.g += x.g; tot.s += x.s; tot.b += x.b; tot.w += x.w; });
  const kpis = [
    ['Total points', tot.pts, '#2563eb', 'trend'], ['Gold medals', tot.g, '#d4a62a', 'medal'], ['Silver medals', tot.s, '#8f98a8', 'medal'],
    ['Bronze medals', tot.b, '#c9803a', 'medal'], ['Wood', tot.w, '#946639', 'medal'],
  ];
  const max = Math.max(1, ...st.map((x) => x.pts));
  const leader = st[0] && st[0].pts > 0 ? st[0] : null;
  const top = st.slice(0, 3), rest = st.slice(3);
  const podium = top.length === 3 ? [top[1], top[0], top[2]] : top;

  const sig = JSON.stringify(st.map((x) => [x.h.id, x.h.name, x.h.color, x.g, x.s, x.b, x.w, x.pts]));
  useEffect(() => {
    if (!c1.current || !st.length) return undefined;
    const cs = getComputedStyle(document.documentElement);
    const tx = cs.getPropertyValue('--muted').trim(), ln = cs.getPropertyValue('--border').trim(), sf = cs.getPropertyValue('--surface').trim();
    Chart.defaults.color = tx; Chart.defaults.font.family = 'Inter, Poppins, sans-serif';
    const L = st.map((x) => x.h.name);
    const base = { responsive: true, maintainAspectRatio: false };
    const ax = { x: { ticks: { color: tx }, grid: { display: false } }, y: { ticks: { color: tx, precision: 0 }, grid: { color: ln }, beginAtZero: true, border: { display: false } } };
    const leg = { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 16 } };
    const mk = [['Gold', 'g', '#d4a62a'], ['Silver', 's', '#b8bec9'], ['Bronze', 'b', '#c9803a'], ['Wood', 'w', '#946639']];
    const charts = [
      new Chart(c1.current, { type: 'bar', data: { labels: L, datasets: mk.map((m) => ({ label: m[0], data: st.map((x) => x[m[1]]), backgroundColor: m[2], borderRadius: 6, borderSkipped: false, maxBarThickness: 34 })) }, options: { ...base, plugins: { legend: leg }, scales: ax } }),
      new Chart(c2.current, { type: 'bar', data: { labels: L, datasets: [{ label: 'Total medals', data: st.map((x) => x.g + x.s + x.b + x.w), backgroundColor: st.map((x) => x.h.color), borderRadius: 8, borderSkipped: false, maxBarThickness: 46 }] }, options: { ...base, plugins: { legend: { display: false } }, scales: ax } }),
      new Chart(c3.current, { type: 'doughnut', data: { labels: L, datasets: [{ data: st.map((x) => x.pts), backgroundColor: st.map((x) => x.h.color), borderColor: sf, borderWidth: 3, hoverOffset: 8 }] }, options: { ...base, cutout: '66%', plugins: { legend: leg } } }),
    ];
    return () => charts.forEach((c) => c.destroy());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, theme]);

  const set = (k) => (e) => setDf({ ...df, [k]: e.target.value });
  const filtered = df.cat || df.house || df.cls;

  return (
    <>
      <div className="hero">
        <small>Championship summary</small>
        <h2>{H.nm('Years', YEAR) === '—' ? 'House Games Championship' : H.nm('Years', YEAR)}</h2>
        <p>Welcome back, {String(ME.name).split(' ')[0]}. Here’s how the houses are doing.</p>
        <div className="hero-c">
          {leader ? (
            <div className="champ"><Icon n="crown" s={26} style={{ color: '#ffd76a' }} /><div><span>{filtered ? 'Leading (filtered view)' : 'Current leader'}</span><b>{leader.h.name} · {leader.pts} pts</b></div></div>
          ) : <div className="champ"><Icon n="flag" s={24} /><div><span>Status</span><b>No results recorded yet</b></div></div>}
        </div>
      </div>

      <div className="filters">
        <Select label="Category" value={df.cat} onChange={set('cat')} list={[['Male', 'Male'], ['Female', 'Female']]} blank="All categories" />
        <Select label="House" value={df.house} onChange={set('house')} list={H.yr('Houses').map((x) => [x.id, x.name])} blank="All houses" />
        <Select label="Class (single-participant games)" value={df.cls} onChange={set('cls')} list={classes.map((x) => [x, x])} blank="All classes" />
      </div>

      <div className="kpis">
        {kpis.map((k) => (
          <div className="kpi" key={k[0]} style={{ '--k': k[2] }}>
            <div className="kpi-i"><Icon n={k[3]} s={20} /></div>
            <div className="v">{k[1]}</div><div className="l">{k[0]}</div>
          </div>
        ))}
      </div>

      <div className="sec-t"><h3>Championship standings</h3></div>
      {!st.length ? <Card><Empty icon="home" title="No houses yet">Add houses for this year from the Houses page.</Empty></Card> : (
        <>
          {podium.length > 0 && <div className="podium">{podium.map((x) => <Pod key={x.h.id} x={x} place={x.rank <= 3 ? x.rank : 3} />)}</div>}
          {rest.length > 0 && (
            <Card flush>
              {rest.map((x) => (
                <div className="rank-row" key={x.h.id} style={{ '--hc': x.h.color }}>
                  <div className={'medal sm ' + MCLS[Math.min(x.rank, 4)]}>{x.rank}</div>
                  <div className="nm"><Dot color={x.h.color} />{x.h.name}</div>
                  <div className="meter"><i style={{ width: (x.pts / max) * 100 + '%' }} /></div>
                  <Tally x={x} />
                  <div className="pt">{x.pts}</div>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      {st.length > 0 && (
        <>
          <div className="sec-t" style={{ marginTop: 26 }}><h3>Performance</h3></div>
          <Card title="Medals won per house" sub="Clustered by medal type"><div className="chart-box"><canvas ref={c1} /></div></Card>
          <div className="grid g2">
            <Card title="Total medals per house"><div className="chart-box"><canvas ref={c2} /></div></Card>
            <Card title="Points scored"><div className="chart-box"><canvas ref={c3} /></div></Card>
          </div>
        </>
      )}
    </>
  );
}
