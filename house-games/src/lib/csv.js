/* Tiny CSV reader and the import templates. */
export function parseCSV(t) {
  const rows = []; let r = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { r.push(c); c = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(c); rows.push(r); r = []; c = ''; }
    else c += ch;
  }
  if (c !== '' || r.length) { r.push(c); rows.push(r); }
  const good = rows.filter((x) => x.join('').trim());
  if (!good.length) return [];
  const h = good.shift().map((x) => x.trim());
  return good.map((x) => { const o = {}; h.forEach((k, i) => { o[k] = (x[i] || '').trim(); }); return o; });
}
export const TPL = {
  Users: 'role,name,email,password\nhousemaster,Jane Doe,jane@example.com,',
  Games: 'name,male,female,maxM,maxF,format\n100m Sprint,yes,yes,1,1,semi\nFootball,yes,no,11,0,quarter\nTug of War,yes,yes,8,8,final',
  Houses: 'name,color,masterEmail\nRed House,#cc0000,jane@example.com',
  Students: 'name,age,cls,gender,house\nJohn Musa,14,JSS2,Male,Red House',
  Entries: 'student,game,category\nJohn Musa,100m Sprint,Male',
};
export function downloadTemplate(t) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([TPL[t]], { type: 'text/csv' }));
  a.download = t.toLowerCase() + '_template.csv';
  a.click();
}
