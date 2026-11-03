import { useState } from 'react';
import { useApp } from '../state.jsx';
import { createReports } from '../lib/reports.js';
import { Btn, Card, Check, Field, Icon, Note, Opts, PageHeader, Select, busy, toast } from '../ui.jsx';

export default function Reports() {
  const { H, YEAR, ME, sgSel, setSgSel } = useApp();
  const [CF, setCF] = useState(() => ({ game: '', house: ME.role === 'housemaster' && H.myHouse() ? H.myHouse().id : '', part: 0 }));
  const R = createReports({ YEAR, CF, yr: H.yr, byId: H.byId, nm: H.nm, standings: H.standings, sigChosen: H.sigChosen, cats: H.cats, gfmt: H.gfmt, toast, busy });
  const rows = R.certRows(CF);
  const nS = rows.filter((x) => x.s).length;
  const gs = H.yr('Games'), hs = H.yr('Houses');

  const items = [
    ['file', 'Full report', 'Complete competition report with a cover page, standings and every game result.', 'Download PDF', R.pdfReport],
    ['slides', 'Slide presentation', 'Editable PowerPoint with standings and game-by-game results.', 'Download PPTX', R.pptReport],
    ['home', 'House certificates', 'One certificate per house: position, points tally and medals.', 'Download PDF', R.houseCerts],
    ['award', 'Game certificates', 'A personal certificate with the name of every student in a medal-winning game (filter below).', 'Download PDF', R.gameCerts],
    ['eye', 'Certificate preview', 'A single sample showing the current design and chosen signatures.', 'Preview PDF', R.certPreview],
  ];

  return (
    <>
      <PageHeader title="Reports & Certificates" sub={H.nm('Years', YEAR) + ' · everything is generated in your browser.'} />
      <div className="grid g3" style={{ marginBottom: 18 }}>
        {items.map(([ic, t, p, b, f]) => (
          <div className="rep" key={t}>
            <div className="rep-i"><Icon n={ic} s={22} /></div>
            <h3>{t}</h3><p>{p}</p>
            <Btn variant="soft" icon="download" onClick={f}>{b}</Btn>
          </div>
        ))}
      </div>

      <Card title="Game certificate options" sub="Choose which certificates are produced.">
        <div className="row">
          <Select label="Game" value={CF.game} onChange={(e) => setCF({ ...CF, game: e.target.value })} list={gs.map((g) => [g.id, g.name])} blank="All games" />
          <Select label="House" value={CF.house} onChange={(e) => setCF({ ...CF, house: e.target.value })} list={hs.map((h) => [h.id, h.name])} blank="All houses" />
          <Field label="Participation"><div style={{ padding: '9px 0 0' }}><Check checked={!!CF.part} onChange={(e) => setCF({ ...CF, part: e.target.checked ? 1 : 0 })}>Also print participation certificates</Check></div></Field>
        </div>
        <div style={{ marginTop: 16 }}>
          <Note icon="award"><b>{rows.length}</b> certificate{rows.length === 1 ? '' : 's'} will be produced ({nS} personal, {rows.length - nS} house).
            {CF.part ? '' : ' Students whose house won no medal are only included when you tick the participation box.'}</Note>
        </div>
      </Card>

      <Card title="Signatures printed on certificates" sub="Principal and game master users add their signature from the Signatures page (the administrator can add it for them).">
        <div className="row" style={{ alignItems: 'start' }}>
          {[['gamemaster', 'Game Master'], ['principal', 'Principal']].map(([role, label]) => {
            const l = H.sigList(role), c = H.sigChosen(role);
            return (
              <div key={role}>
                <Field label={label + ' signature on certificates'}>
                  <select className="select" value={sgSel[role] === 'none' ? 'none' : (c ? c.id : '')} onChange={(e) => setSgSel({ ...sgSel, [role]: e.target.value })}>
                    {l.length ? <><Opts list={l.map((s) => [s.id, s.name])} /><option value="none">No signature (blank line)</option></> : <option value="">No signature uploaded yet</option>}
                  </select>
                </Field>
                {c && <div className="sgbox"><img src={c.data} alt="signature" /></div>}
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
