import { useEffect, useState } from 'react';
import { useApp } from '../state.jsx';
import { FMTL, FMTN, FMTS, MED, MCLS, ORD, PTS, RN, STAGES } from '../lib/constants.js';
import { clearGame, genFixtures, setResults, setWinner } from '../lib/api.js';
import { Badge, Btn, Card, Dot, Empty, Field, Icon, Note, Opts, PageHeader, Select, attempt, confirmDialog } from '../ui.jsx';

export default function Fixtures() {
  const { H, reload } = useApp();
  const gs = H.yr('Games'), hs = H.yr('Houses');
  const [g, setG] = useState('');
  const [c, setC] = useState('');
  const [fh, setFh] = useState([]);
  const [rp, setRp] = useState(['', '', '', '']);

  const game = gs.filter((x) => x.id === g)[0] || gs[0];
  const cl = H.cats(game);
  const cat = cl.some((x) => x[0] === c) ? c : (cl[0] ? cl[0][0] : '');
  const f = game ? H.gfmt(game) : 'semi', need = FMTN[f];
  const can = H.isGM();
  const HO = hs.map((x) => [x.id, x.name]);
  const res = game ? H.yr('Results').filter((r) => r.gameId === game.id && r.category === cat) : [];
  const pos = {}; res.forEach((r) => { pos[r.pos] = r.houseId; });
  const ms = game ? H.yr('Matches').filter((m) => m.gameId === game.id && m.category === cat) : [];
  const mb = {}; ms.forEach((m) => { mb[m.round] = m; });

  const first = f === 'quarter' ? ['Q1', 'Q2', 'Q3', 'Q4'] : ['S1', 'S2'];
  const defFh = () => {
    if (f === 'final') return [];
    if (ms.length && mb[first[0]]) { const d = []; first.forEach((k) => { d.push(mb[k].h1 || '', mb[k].h2 || ''); }); return d; }
    return HO.slice(0, need).map((x) => x[0]);
  };
  const key = (game ? game.id : '') + cat + f + ms.map((m) => m.id + m.h1 + m.h2).join() + hs.length;
  const resKey = res.map((r) => r.pos + r.houseId).join();
  useEffect(() => { setFh(defFh()); /* eslint-disable-next-line */ }, [key]);
  useEffect(() => { setRp([1, 2, 3, 4].map((p) => pos[p] || '')); /* eslint-disable-next-line */ }, [resKey, key]);

  const head = <PageHeader title="Fixtures & Results" sub="Build knock-out brackets, record match winners and award medals." />;
  if (!gs.length || !hs.length) return <>{head}<Card><Empty icon="bracket" title="Not ready yet">Games and houses must be created for this year first.</Empty></Card></>;
  const started = H.gameStarted(game.id);

  const act = (fn, msg) => attempt(async () => { await fn(); await reload(); }, msg);
  const doGen = async () => {
    if (ms.length && !(await confirmDialog('Resetting the fixtures also clears the results of this game category. Continue?', { title: 'Reset fixtures?', confirm: 'Reset' }))) return;
    act(() => genFixtures(game.id, cat, fh), 'Fixtures created.');
  };
  const doClear = async () => {
    if (!(await confirmDialog('Remove ALL fixtures and results of this game (both categories)? This also unlocks its format.', { title: 'Clear fixtures & results?', confirm: 'Clear everything' }))) return;
    act(() => clearGame(game.id), 'Fixtures and results cleared.');
  };
  const house = (id) => H.byId('Houses', id);
  const Team = ({ id, win }) => id
    ? <div className={'team' + (win ? ' win' : '')}><Dot color={(house(id) || {}).color} />{H.nm('Houses', id)}{win && <Icon n="trophy" s={14} style={{ marginLeft: 'auto', color: 'var(--ok)' }} />}</div>
    : <div className="team tbd">To be decided</div>;

  return (
    <>
      {head}
      <Card>
        <div className="row">
          <Select label="Game" value={game.id} onChange={(e) => setG(e.target.value)} list={gs.map((x) => [x.id, x.name + ' · ' + FMTS[H.gfmt(x)]])} />
          <Select label="Category" value={cat} onChange={(e) => setC(e.target.value)} list={cl} />
        </div>
        <div className="bar" style={{ marginTop: 14 }}>
          <Badge>{FMTL[f]}</Badge>
          {can && (ms.length || started) ? <Btn variant="danger" size="sm" className="soft" icon="trash" onClick={doClear}>Clear fixtures & results</Btn> : null}
        </div>
        {!can && <div style={{ marginTop: 14 }}><Note>View only – the admin or game master records match results.</Note></div>}
      </Card>

      {f !== 'final' && (
        <Card title="Knock-out fixtures">
          {can && (hs.length < need
            ? <Note icon="alert" tone="bad">This format needs {need} houses but only {hs.length} exist for this year. Add houses or change the game format.</Note>
            : (
              <>
                <div className="row">
                  {fh.map((v, i) => (
                    <Field key={i} label={RN[first[Math.floor(i / 2)]] + ' · house ' + ((i % 2) + 1)}>
                      <select className="select" value={v} onChange={(e) => { const n = fh.slice(); n[i] = e.target.value; setFh(n); }}><Opts list={HO} blank="—" /></select>
                    </Field>
                  ))}
                </div>
                <div className="bar" style={{ marginTop: 16 }}><Btn icon={ms.length ? 'refresh' : 'bracket'} onClick={doGen}>{ms.length ? 'Reset fixtures' : 'Create fixtures'}</Btn></div>
              </>
            ))}
          {ms.length > 0 && (
            <>
              {STAGES[f].map((sg) => (
                <div className="stage" key={sg[0]}>
                  <h4>{sg[0]}</h4>
                  <div className="grid g4">
                    {sg[1].map((k) => {
                      const m = mb[k]; if (!m) return null;
                      const ready = m.h1 && m.h2;
                      return (
                        <div className="match" key={k}>
                          <div className="mt"><span>{RN[k]}</span>{m.winner && <span style={{ color: 'var(--ok)' }}>Played</span>}</div>
                          <Team id={m.h1} win={m.winner && m.winner === m.h1} />
                          <div className="vs">VS</div>
                          <Team id={m.h2} win={m.winner && m.winner === m.h2} />
                          {can && ready && (
                            <div className="bar">
                              <Btn size="sm" onClick={() => act(() => setWinner(m.id, m.h1), 'Match recorded.')}>{H.nm('Houses', m.h1)} won</Btn>
                              <Btn size="sm" onClick={() => act(() => setWinner(m.id, m.h2), 'Match recorded.')}>{H.nm('Houses', m.h2)} won</Btn>
                              {m.winner && <Btn size="sm" variant="ghost" onClick={() => act(() => setWinner(m.id, null), 'Match recorded.')}>Clear</Btn>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 18 }}><Note>Final: winner = Gold, loser = Silver. Third-place match: winner = Bronze, loser = Wood. Points: Gold 3 · Silver 2 · Bronze 1 · Wood 0.</Note></div>
            </>
          )}
        </Card>
      )}

      <Card title={'Select winners · ' + game.name + ' (' + cat + ')'} sub={f === 'final' ? 'Finals only: choose the house that wins each medal.' : 'These fill in automatically from the knock-out results. You can also choose them by hand (this replaces the bracket result).'}>
        <div className="grid g4">
          {[1, 2, 3, 4].map((p) => (
            <div className="medal-sel" key={p}>
              <div className={'medal sm ' + MCLS[p]}>{p}</div>
              <Field label={ORD[p] + ' – ' + MED[p] + ' (' + PTS[p] + ' pts)'}>
                <select className="select" disabled={!can} value={rp[p - 1] || ''} onChange={(e) => { const n = rp.slice(); n[p - 1] = e.target.value; setRp(n); }}><Opts list={HO} blank="—" /></select>
              </Field>
            </div>
          ))}
        </div>
        {can && <div className="bar end" style={{ marginTop: 16 }}><Btn icon="check" onClick={() => act(() => setResults(game.id, cat, rp), 'Winners saved.')}>Save winners</Btn></div>}
      </Card>

      <Card flush title="All results">
        <div className="tw"><table>
          <thead><tr><th>Game</th><th>Format</th><th>Category</th><th>🥇 Gold</th><th>🥈 Silver</th><th>🥉 Bronze</th><th>🪵 Wood</th></tr></thead>
          <tbody>
            {gs.map((gm) => H.cats(gm).map((cc) => {
              const p = {}; H.yr('Results').filter((r) => r.gameId === gm.id && r.category === cc[0]).forEach((r) => { p[r.pos] = r.houseId; });
              return (
                <tr key={gm.id + cc[0]}><td><b>{gm.name}</b></td><td><Badge tone="gray">{FMTS[H.gfmt(gm)]}</Badge></td><td>{cc[0]}</td>
                  {[1, 2, 3, 4].map((i) => <td key={i}>{p[i] ? <span className="cellname" style={{ fontWeight: 500 }}><Dot color={(house(p[i]) || {}).color} />{H.nm('Houses', p[i])}</span> : <span className="hint">—</span>}</td>)}</tr>
              );
            }))}
          </tbody>
        </table></div>
      </Card>
    </>
  );
}
