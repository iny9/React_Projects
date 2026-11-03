import { useState } from 'react';
import { useApp } from '../state.jsx';
import { CFG, TABLE } from '../lib/constants.js';
import { downloadTemplate, parseCSV } from '../lib/csv.js';
import { manageUser, saveRow } from '../lib/api.js';
import { lc } from '../lib/helpers.js';
import { Btn, Field, Icon, Modal, toast } from '../ui.jsx';

const flag = (v) => ['1', 'true', 'yes', 'y'].includes(lc(v));
const fmtWord = (v) => { v = lc(v); return /quarter/.test(v) ? 'quarter' : /semi/.test(v) ? 'semi' : /final/.test(v) ? 'final' : ''; };

export default function ImportDialog({ t, onClose }) {
  const { H, ME, YEAR, reload } = useApp();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [working, setWorking] = useState(false);

  async function run() {
    if (!file) return toast('Choose a CSV file.', true);
    const rows = parseCSV(await file.text());
    if (!rows.length) return toast('The file has no data rows.', true);
    setWorking(true);
    let ok = 0; const errors = [];
    const mh = ME.role === 'housemaster' ? H.myHouse() : null;
    for (let i = 0; i < rows.length; i++) {
      try {
        const k = {}; Object.keys(rows[i]).forEach((c) => { k[lc(c)] = String(rows[i][c]).trim(); });
        if (t === 'Users') {
          await manageUser({ action: 'create', role: lc(k.role), name: k.name, email: k.email, password: k.password || undefined });
        } else {
          const row = { year: YEAR };
          if (t === 'Games') Object.assign(row, { name: k.name, male: flag(k.male), female: flag(k.female), maxM: k.maxm, maxF: k.maxf, format: fmtWord(k.format) || 'semi' });
          if (t === 'Houses') Object.assign(row, { name: k.name, color: k.color || '#2563eb', masterEmail: k.masteremail });
          if (t === 'Students') {
            Object.assign(row, { name: k.name, age: k.age, cls: k.cls || k.class || '', gender: /^f/i.test(k.gender) ? 'Female' : 'Male' });
            if (mh) {
              if (k.house && lc(k.house) !== lc(mh.name)) throw new Error('You can only import students for your own house (' + mh.name + ')');
              row.houseId = mh.id;
            } else {
              const h = H.yr('Houses').filter((x) => lc(x.name) === lc(k.house))[0];
              if (!h) throw new Error('House "' + k.house + '" not found');
              row.houseId = h.id;
            }
          }
          if (t === 'Entries') {
            const s = H.yr('Students').filter((x) => lc(x.name) === lc(k.student) && (!mh || x.houseId === mh.id))[0];
            const g = H.yr('Games').filter((x) => lc(x.name) === lc(k.game))[0];
            if (!s) throw new Error('Student "' + k.student + '" not found');
            if (!g) throw new Error('Game "' + k.game + '" not found');
            Object.assign(row, { studentId: s.id, gameId: g.id, category: /^f/i.test(k.category) ? 'Female' : 'Male' });
          }
          await saveRow(TABLE[t], row);
        }
        ok++;
      } catch (e) { errors.push('Row ' + (i + 2) + ': ' + e.message); }
    }
    await reload();
    setResult({ ok, errors });
    setWorking(false);
  }

  return (
    <Modal title={'Import ' + CFG[t].nm + ' from CSV'} onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Close</Btn><Btn icon="upload" loading={working} onClick={run}>Import</Btn></>}>
      <div className="note"><Icon n="info" s={18} /><div>The first row must be a header row with these columns:<br /><b>{CFG[t].hint}</b></div></div>
      <Btn variant="soft" size="sm" icon="download" onClick={() => downloadTemplate(t)}>Download template</Btn>
      <div style={{ marginTop: 16 }}><Field label="CSV file"><input className="input" type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files[0] || null)} /></Field></div>
      {result && (
        <div className={'note' + (result.errors.length ? ' bad' : '')} style={{ marginBottom: 0 }}>
          <Icon n={result.errors.length ? 'alert' : 'checkCircle'} s={18} />
          <div><b>{result.ok} imported.</b>{result.errors.map((e) => <div key={e} className="hint">{e}</div>)}</div>
        </div>
      )}
    </Modal>
  );
}
