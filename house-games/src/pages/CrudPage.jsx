import { useState } from 'react';
import { useApp } from '../state.jsx';
import { CFG, CLASSES, COLS, FMTL, FMTS, HEAD, ROLE_LABEL, SIGR, TABLE } from '../lib/constants.js';
import { deleteRow, manageUser, saveRow } from '../lib/api.js';
import { Avatar, Badge, Btn, Card, Check, Dot, Empty, Field, IconBtn, Modal, Note, Opts, PageHeader, Search, attempt, confirmDialog } from '../ui.jsx';
import ImportDialog from './ImportDialog.jsx';
import SigDialog from './SigDialog.jsx';

const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
const ICON = { Users: 'shield', Years: 'calendar', Games: 'gamepad', Houses: 'home', Students: 'users', Entries: 'clipboard' };
const SUB = {
  Users: 'Create logins for house masters, the principal and others.',
  Years: 'Each competition season has its own games, houses and results.',
  Games: 'Define each game, its categories, team size and knock-out format.',
  Houses: 'The competing houses and their house masters.',
  Students: 'Students who can be entered into games.',
  Entries: 'Every student entry for a game. Use the picker above to add several at once.',
};

export default function CrudPage({ t }) {
  const { ME, D, YEAR, H, reload, setYEAR } = useApp();
  const [form, setForm] = useState(null);      // {id?}
  const [importing, setImporting] = useState(false);
  const [sigFor, setSigFor] = useState(null);
  const [q, setQ] = useState('');

  const c = CFG[t];
  const all = (c.ny ? D[t] : H.yr(t)).slice();
  if (t === 'Students' || t === 'Entries') all.sort((a, b) => H.nm('Houses', a.houseId).localeCompare(H.nm('Houses', b.houseId)));
  const can = H.canT(t);
  const mh = H.myHouse();
  const showSig = ME.role === 'admin' || ME.role === 'gamemaster';
  const cols = COLS[t].filter((x) => x !== 'signature' || showSig);

  const text = (r) => cols.map((x) => { const v = cellText(r, x); return v == null ? '' : String(v); }).join(' ').toLowerCase();
  function cellText(r, col) {
    if (col === 'houseId') return H.nm('Houses', r.houseId);
    if (col === 'gameId') return H.nm('Games', r.gameId);
    if (col === 'studentId') return H.nm('Students', r.studentId);
    return r[col];
  }
  const rows = q ? all.filter((r) => text(r).indexOf(q.toLowerCase()) >= 0) : all;

  function cell(r, col) {
    if (col === 'name') {
      if (t === 'Houses') return <span className="cellname"><Dot color={r.color} />{r.name}</span>;
      if (t === 'Users' || t === 'Students') return <span className="cellname"><Avatar name={r.name} size="sm" />{r.name}</span>;
      return <b>{r.name}</b>;
    }
    if (col === 'role') return <Badge tone={r.role === 'admin' ? 'gold' : ''}>{ROLE_LABEL[r.role] || r.role}</Badge>;
    if (col === 'houseId') { const h = H.byId('Houses', r.houseId); return h ? <span className="cellname" style={{ fontWeight: 500 }}><Dot color={h.color} />{h.name}</span> : '—'; }
    if (col === 'gameId') return H.nm('Games', r.gameId);
    if (col === 'studentId') return H.nm('Students', r.studentId);
    if (col === 'color') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 22, height: 22, borderRadius: 7, background: r.color, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15)' }} /><span className="hint">{r.color}</span></span>;
    if (col === 'active') return r.active ? <Badge tone="ok">Active</Badge> : <Badge tone="gray">Closed</Badge>;
    if (col === 'categories') return <>{r.male && <Badge>Male</Badge>} {r.female && <Badge tone="gold">Female</Badge>}</>;
    if (col === 'participants') return (r.male ? 'M: ' + r.maxM + '  ' : '') + (r.female ? 'F: ' + r.maxF : '');
    if (col === 'format') return <Badge tone="gray"><span title={FMTL[H.gfmt(r)]}>{FMTS[H.gfmt(r)]}</span></Badge>;
    if (col === 'signature') return SIGR.indexOf(r.role) < 0 ? '' : (H.sigOf(r.id) ? <Badge tone="ok">Uploaded</Badge> : <span className="hint">—</span>);
    if (col === 'masterEmail') return r.masterEmail ? (D.Users.find((u) => String(u.email).toLowerCase() === String(r.masterEmail).toLowerCase())?.name || r.masterEmail) : <span className="hint">—</span>;
    return r[col] == null || r[col] === '' ? '—' : r[col];
  }

  async function remove(r) {
    const extra = ['Years', 'Games', 'Houses', 'Students'].includes(t) ? ' and everything linked to it' : '';
    const ok = await confirmDialog('This will permanently delete this record' + extra + '. This cannot be undone.', { title: 'Delete record?', confirm: 'Delete' });
    if (!ok) return;
    await attempt(async () => {
      if (t === 'Users') await manageUser({ action: 'delete', id: r.id });
      else await deleteRow(TABLE[t], r.id);
      await reload();
    }, 'Deleted.');
  }

  const isEntries = t === 'Entries';
  return (
    <>
      {!isEntries && (
        <PageHeader title={c.nm} sub={(c.ny ? '' : H.nm('Years', YEAR) + ' · ') + SUB[t]}>
          {can && c.hint && <Btn variant="ghost" icon="upload" onClick={() => setImporting(true)}>Import CSV</Btn>}
          {can && <Btn icon="plus" onClick={() => setForm({})}>Add {t === 'Entries' ? 'entry' : cap(c.nm.replace(/s$/, '').replace('Competition Year', 'year').toLowerCase())}</Btn>}
        </PageHeader>
      )}
      {t === 'Students' && ME.role === 'housemaster' && (
        <Note icon={mh ? 'info' : 'alert'} tone={mh ? '' : 'bad'}>{mh ? <>You can add students to <b>{mh.name}</b> only.</> : 'You are not assigned to a house for this year yet.'}</Note>
      )}
      <Card flush title={isEntries ? 'All entries' : undefined} sub={isEntries ? H.nm('Years', YEAR) : undefined}
        actions={isEntries && can ? <Btn variant="ghost" size="sm" icon="upload" onClick={() => setImporting(true)}>Import CSV</Btn> : null}>
        <div className="toolbar">
          <Search value={q} onChange={setQ} placeholder={'Search ' + c.nm.toLowerCase() + '…'} />
          <span className="hint count">{rows.length} {rows.length === 1 ? 'record' : 'records'}</span>
        </div>
        <div className="tw">
          {rows.length > 0 && (
            <table>
              <thead><tr>{cols.map((x) => <th key={x}>{HEAD[x] || cap(x)}</th>)}<th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    {cols.map((x) => <td key={x}>{cell(r, x)}</td>)}
                    <td className="act">
                      {t === 'Users' && ME.role === 'admin' && SIGR.indexOf(r.role) >= 0 && <Btn variant="soft" size="sm" icon="pen" onClick={() => setSigFor(r.id)}>Signature</Btn>}
                      {(t === 'Years' ? ME.role === 'admin' : H.canRow(t, r)) && (
                        <>
                          {t !== 'Entries' && <IconBtn icon="edit" label="Edit" cls="sm" onClick={() => setForm({ id: r.id })} />}
                          <IconBtn icon="trash" label="Delete" cls="sm bad" onClick={() => remove(r)} />
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!rows.length && <Empty icon={ICON[t]} title={q ? 'No matches' : 'Nothing here yet'}>{q ? 'Try a different search.' : can ? 'Use the Add button to create the first one.' : 'Records will appear here.'}</Empty>}
      </Card>
      {form && <FormModal t={t} id={form.id} onClose={() => setForm(null)} setYEAR={setYEAR} />}
      {importing && <ImportDialog t={t} onClose={() => setImporting(false)} />}
      {sigFor && <SigDialog uid={sigFor} onClose={() => setSigFor(null)} />}
    </>
  );
}

/* field = [key,label,kind,list,blankLabel,hint,disabled] */
function fieldList(t, v, { ME, H, D }) {
  const mh = H.myHouse();
  if (t === 'Users') return [
    ['role', 'Role', 'sel', (ME.role === 'admin' ? ['gamemaster', 'housemaster', 'student', 'board', 'principal', 'admin'] : ['housemaster']).map((x) => [x, ROLE_LABEL[x]])],
    ['name', 'Full name'],
    ['email', 'Email address (used to log in and for password reset)', 'email'],
    ['password', 'Password', 'password', null, null, 'Leave blank = ' + (v.id ? 'unchanged' : '12345678') + '. Minimum 6 characters.'],
  ];
  if (t === 'Years') return [['name', 'Year / season name (e.g. 2026/2027)'], ['active', 'Mark as the active year', 'chk']];
  if (t === 'Games') {
    const lock = v.id && H.gameStarted(v.id);
    return [
      ['name', 'Game name'],
      ['male', 'Exists for Male category', 'chk'], ['maxM', 'Participants per house (Male)', 'num'],
      ['female', 'Exists for Female category', 'chk'], ['maxF', 'Participants per house (Female)', 'num'],
      ['format', 'Game format', 'sel', ['quarter', 'semi', 'final'].map((k) => [k, FMTL[k]]), null,
        'Quarter-finals needs 8 houses · Semi-finals needs 4 houses · Finals only works with any number of houses.' + (lock ? ' The format is locked because this game already has fixtures or results – use “Clear fixtures & results” on the Fixtures page to unlock it.' : ''), lock],
    ];
  }
  if (t === 'Houses') return [
    ['name', 'House name'], ['color', 'House colour', 'color'],
    ['masterEmail', 'House master', 'sel', D.Users.filter((u) => u.role === 'housemaster').map((u) => [u.email, u.name + ' (' + u.email + ')']), '— none —'],
  ];
  if (t === 'Students') {
    const F = [['name', 'Full name'], ['age', 'Age', 'num'], ['cls', 'Class (pick or type any class)', 'dl', CLASSES], ['gender', 'Gender', 'sel', [['Male', 'Male'], ['Female', 'Female']]]];
    if (ME.role === 'housemaster') F.push(['houseId', 'House (your house only)', 'sel', mh ? [[mh.id, mh.name]] : [], null, mh ? '' : 'You are not assigned to a house for this year.']);
    else F.push(['houseId', 'House (any house)', 'sel', H.yr('Houses').map((h) => [h.id, h.name]), '— select house —']);
    return F;
  }
  if (t === 'Entries') {
    const cat = v.category || 'Male';
    const sts = H.yr('Students').filter((s) => s.gender === cat && (ME.role !== 'housemaster' || (mh && s.houseId === mh.id)))
      .map((s) => [s.id, s.name + ' (' + s.cls + ', ' + H.nm('Houses', s.houseId) + ')']);
    return [
      ['gameId', 'Game', 'sel', H.yr('Games').map((g) => [g.id, g.name])],
      ['category', 'Category', 'sel', [['Male', 'Male'], ['Female', 'Female']]],
      ['studentId', 'Student', 'sel', sts, '— select student —'],
    ];
  }
  return [];
}

function FormModal({ t, id, onClose, setYEAR }) {
  const app = useApp();
  const { ME, H, YEAR, reload } = app;
  const mh = H.myHouse();
  const existing = id ? app.D[t].filter((r) => r.id === id)[0] : null;
  const initial = existing ? { ...existing } : (
    t === 'Games' ? { male: true, female: true, maxM: 1, maxF: 1, format: 'semi' }
      : t === 'Years' ? { active: true }
        : t === 'Students' && ME.role === 'housemaster' && mh ? { houseId: mh.id }
          : t === 'Houses' ? { color: '#2563eb' }
            : t === 'Users' ? { role: 'housemaster' }
              : t === 'Entries' ? { gameId: (H.yr('Games')[0] || {}).id, category: 'Male' } : {});
  if (t === 'Games' && existing) initial.format = H.gfmt(existing);
  const [v, setV] = useState(initial);
  const [saving, setSaving] = useState(false);
  const F = fieldList(t, v, app);

  async function save() {
    const row = { ...v };
    if (!CFG[t].ny) row.year = YEAR;
    if (t === 'Students' && ME.role === 'housemaster' && mh) row.houseId = mh.id;
    setSaving(true);
    const ok = await attempt(async () => {
      if (t === 'Entries' && !row.studentId) throw new Error('Select a student.');
      if (t === 'Users') {
        await manageUser({ action: id ? 'update' : 'create', id, role: row.role, name: row.name, email: row.email, password: row.password || undefined });
      } else {
        const sv = await saveRow(TABLE[t], row);
        if (t === 'Years' && sv.active) setYEAR(sv.id);
      }
      await reload();
    }, 'Saved.');
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Modal title={(id ? 'Edit' : 'Add') + ' · ' + CFG[t].nm} onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn loading={saving} icon="check" onClick={save}>Save</Btn></>}>
      {F.map((f) => {
        const [k, label, kind, list, blank, hint, disabled] = f;
        const val = v[k];
        const set = (x) => setV({ ...v, [k]: x });
        if (kind === 'chk') return <Check key={k} checked={val} onChange={(e) => set(e.target.checked)}>{label}</Check>;
        if (kind === 'sel') return (
          <Field key={k} label={label} hint={hint}>
            <select className="select" value={val == null ? '' : val} disabled={!!disabled} onChange={(e) => set(e.target.value)}><Opts list={list} blank={blank} /></select>
          </Field>
        );
        if (kind === 'dl') return (
          <Field key={k} label={label}>
            <input className="input" list={'dl_' + k} value={val || ''} onChange={(e) => set(e.target.value)} />
            <datalist id={'dl_' + k}>{list.map((x) => <option key={x} value={x} />)}</datalist>
          </Field>
        );
        return (
          <Field key={k} label={label} hint={hint}>
            <input className="input" type={kind === 'num' ? 'number' : kind || 'text'} value={k === 'password' ? (val || '') : (val == null ? '' : val)} onChange={(e) => set(e.target.value)} autoComplete={k === 'password' ? 'new-password' : undefined} />
          </Field>
        );
      })}
    </Modal>
  );
}
