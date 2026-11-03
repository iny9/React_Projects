/* Pure data helpers (ported from the original app). makeHelpers() is rebuilt whenever the data changes. */
import { PTS, FMTN, SIGR } from './constants.js';

export const esc = (s) => String(s == null ? '' : s);
export const lc = (s) => String(s || '').trim().toLowerCase();

export function makeHelpers({ D, YEAR, ME, SGSEL }) {
  const yr = (t) => (D[t] || []).filter((r) => String(r.year) === String(YEAR));
  const byId = (t, id) => (D[t] || []).filter((r) => r.id === id)[0];
  const nm = (t, id) => { const r = byId(t, id); return r ? r.name : '—'; };
  const myHouse = () => (ME ? yr('Houses').filter((h) => lc(h.masterEmail) === lc(ME.email))[0] : undefined);
  const isGM = () => !!ME && (ME.role === 'admin' || ME.role === 'gamemaster');

  /** may the signed-in user add rows to this table? (the database enforces it again) */
  function canT(t) {
    const r = ME.role;
    if (r === 'admin') return true;
    if (t === 'Users' || t === 'Games' || t === 'Houses') return r === 'gamemaster';
    if (t === 'Students' || t === 'Entries') return r === 'gamemaster' || r === 'housemaster';
    return false;
  }
  function canRow(t, r) {
    if (ME.role === 'admin') return true;
    if (t === 'Users') return ME.role === 'gamemaster' && r.role === 'housemaster';
    if (ME.role === 'housemaster') { const h = myHouse(); return !!h && r.houseId === h.id; }
    return canT(t);
  }
  const gfmt = (g) => (g && FMTN[g.format] !== undefined ? g.format : 'semi');
  const gameStarted = (id) => yr('Matches').concat(yr('Results')).some((x) => x.gameId === id);
  const cats = (g) => (g ? [g.male ? ['Male', 'Male'] : null, g.female ? ['Female', 'Female'] : null].filter(Boolean) : []);

  /** the single student behind a result (only for games with 1 participant per house) */
  function partStudent(r) {
    const g = byId('Games', r.gameId); if (!g) return null;
    const mx = Number(r.category === 'Male' ? g.maxM : g.maxF); if (mx !== 1) return null;
    const e = yr('Entries').filter((x) => x.gameId === r.gameId && x.category === r.category && x.houseId === r.houseId)[0];
    return e ? byId('Students', e.studentId) : null;
  }
  function resRows(f) {
    return yr('Results').filter((r) => {
      if (f.cat && r.category !== f.cat) return false;
      if (f.house && r.houseId !== f.house) return false;
      if (f.cls) { const s = partStudent(r); if (!s || s.cls !== f.cls) return false; }
      return true;
    });
  }
  function standings(f) {
    const m = {};
    yr('Houses').forEach((h) => { m[h.id] = { h, g: 0, s: 0, b: 0, w: 0, pts: 0 }; });
    resRows(f).forEach((r) => {
      const x = m[r.houseId]; if (!x) return;
      const p = +r.pos;
      if (p === 1) x.g++; if (p === 2) x.s++; if (p === 3) x.b++; if (p === 4) x.w++;
      x.pts += PTS[p] || 0;
    });
    const a = Object.keys(m).map((k) => m[k]);
    a.sort((x, y) => y.pts - x.pts || y.g - x.g || y.s - x.s || y.b - x.b);
    a.forEach((x, i) => { x.rank = i + 1; });
    return a.filter((x) => !f.house || x.h.id === f.house);
  }

  const sigOf = (uid) => (D.Signatures || []).filter((x) => x.userId === uid)[0];
  const sigList = (role) => (D.Signatures || []).filter((s) => s.role === role);
  function sigChosen(role) {
    const sel = (SGSEL || {})[role]; if (sel === 'none') return null;
    const l = sigList(role);
    return l.filter((s) => s.id === sel)[0] || l[0] || null;
  }
  return { yr, byId, nm, myHouse, isGM, canT, canRow, gfmt, gameStarted, cats, partStudent, resRows, standings, sigOf, sigList, sigChosen, SIGR };
}
