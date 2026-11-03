import { useState } from 'react';
import { useApp } from '../state.jsx';
import { Btn, Card, Dot, Empty, Field, Icon, Note, Opts, PageHeader, Search, attempt } from '../ui.jsx';
import { saveEntries } from '../lib/api.js';
import { lc } from '../lib/helpers.js';

/** Tick several students at once. Limits are enforced here and again in the database. */
export default function EntriesPanel() {
  const { H, ME, reload } = useApp();
  const gs = H.yr('Games');
  const [g, setG] = useState('');
  const [c, setC] = useState('');
  const [sel, setSel] = useState({});
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);

  const head = <PageHeader title="Entries" sub="Pick a game, tick the students taking part, then save. Each house has a limit per game category." />;
  if (!gs.length) return <>{head}<Card><Empty icon="gamepad" title="No games yet">Ask the game master to add games for this year.</Empty></Card></>;

  const game = gs.filter((x) => x.id === g)[0] || gs[0];
  const cl = H.cats(game);
  const cat = cl.some((x) => x[0] === c) ? c : (cl[0] ? cl[0][0] : '');
  const mx = Number(cat === 'Male' ? game.maxM : game.maxF) || 0;
  const mh = ME.role === 'housemaster' ? H.myHouse() : null;

  const ex = {};
  H.yr('Entries').filter((e) => e.gameId === game.id && e.category === cat).forEach((e) => { ex[e.studentId] = 1; });
  const ss = H.yr('Students').filter((s) => s.gender === cat && (!mh || s.houseId === mh.id));
  ss.sort((a, b) => H.nm('Houses', a.houseId).localeCompare(H.nm('Houses', b.houseId)) || String(a.name).localeCompare(String(b.name)));
  const visible = ss.filter((s) => !q || lc(s.name).indexOf(lc(q)) >= 0);

  const used = {};
  ss.forEach((s) => { if (ex[s.id] || sel[s.id]) used[s.houseId] = (used[s.houseId] || 0) + 1; });
  const picked = Object.keys(sel).filter((id) => sel[id]);

  const tog = (s) => { const n = { ...sel }; if (n[s.id]) delete n[s.id]; else n[s.id] = true; setSel(n); };
  const all = () => {
    const n = { ...sel }, u = { ...used };
    visible.forEach((s) => { if (!ex[s.id] && !n[s.id] && (u[s.houseId] || 0) < mx) { n[s.id] = true; u[s.houseId] = (u[s.houseId] || 0) + 1; } });
    setSel(n);
  };
  const save = async () => {
    setSaving(true);
    const ok = await attempt(async () => { await saveEntries(game.id, cat, picked); await reload(); },
      picked.length + (picked.length === 1 ? ' entry saved.' : ' entries saved.'));
    setSaving(false);
    if (ok) setSel({});
  };

  const groups = [];
  visible.forEach((s) => {
    let gr = groups[groups.length - 1];
    if (!gr || gr.id !== s.houseId) { gr = { id: s.houseId, list: [] }; groups.push(gr); }
    gr.list.push(s);
  });

  return (
    <>
      {head}
      <Card title="Select students for a game" sub="Boxes lock automatically when a house reaches its limit.">
        <div className="row">
          <Field label="Game">
            <select className="select" value={game.id} onChange={(e) => { setG(e.target.value); setSel({}); }}>
              <Opts list={gs.map((x) => [x.id, x.name + ' (' + (x.male ? 'M ' + x.maxM : '') + (x.male && x.female ? ' · ' : '') + (x.female ? 'F ' + x.maxF : '') + ' per house)'])} />
            </select>
          </Field>
          <Field label="Category"><select className="select" value={cat} onChange={(e) => { setC(e.target.value); setSel({}); }}><Opts list={cl} /></select></Field>
          <Field label="Search student"><Search value={q} onChange={setQ} placeholder="Type a name…" /></Field>
        </div>
        <div style={{ marginTop: 18 }}>
          {ME.role === 'housemaster' && !mh ? <Note icon="alert" tone="bad">You are not assigned to a house for this year yet.</Note>
            : !ss.length ? <Empty icon="users" title={'No ' + cat.toLowerCase() + ' students' + (mh ? ' in your house' : '') + ' yet'}>Add students on the Students page first.</Empty>
              : (
                <>
                  <div className="bar" style={{ marginBottom: 12, justifyContent: 'space-between' }}>
                    <span className="hint">Limit: <b>{mx}</b> {cat.toLowerCase()} participant{mx === 1 ? '' : 's'} per house · <b>{picked.length}</b> new selected</span>
                    <div className="bar">
                      <Btn variant="ghost" size="sm" onClick={all}>Select all (up to limit)</Btn>
                      <Btn variant="ghost" size="sm" disabled={!picked.length} onClick={() => setSel({})}>Clear</Btn>
                    </div>
                  </div>
                  <div className="entwrap">
                    {groups.map((gr) => {
                      const u = used[gr.id] || 0;
                      return (
                        <div className="entgrp" key={gr.id}>
                          <div className="enthd" style={{ '--hc': (H.byId('Houses', gr.id) || {}).color || '#2563eb' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center' }}><Dot color={(H.byId('Houses', gr.id) || {}).color} />{H.nm('Houses', gr.id)}</span>
                            <span className="meter"><i style={{ width: Math.min(100, mx ? (u / mx) * 100 : 0) + '%' }} /></span>
                            <span className="hint">{u} / {mx}</span>
                          </div>
                          {gr.list.map((s) => {
                            const entered = !!ex[s.id], checked = entered || !!sel[s.id];
                            const full = !checked && u >= mx;
                            return (
                              <label className="entrow check" key={s.id} style={full ? { opacity: .55, cursor: 'not-allowed' } : undefined}>
                                <input type="checkbox" checked={checked} disabled={entered || full} onChange={() => tog(s)} />
                                <span className="box"><Icon n="check" s={13} style={{ strokeWidth: 3.4 }} /></span>
                                <span className="nm">{s.name}</span>
                                <span className="hint">{s.cls}{s.age ? ' · ' + s.age + ' yrs' : ''}</span>
                                {entered && <span className="badge ok">Entered</span>}
                              </label>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                  <div className="bar end" style={{ marginTop: 16 }}>
                    <Btn icon="check" loading={saving} disabled={!picked.length} onClick={save}>Save {picked.length || ''} selected {picked.length === 1 ? 'entry' : 'entries'}</Btn>
                  </div>
                </>
              )}
        </div>
      </Card>
    </>
  );
}
