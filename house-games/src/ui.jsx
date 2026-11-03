import { useEffect, useState } from 'react';

/* ==========================================================================
   Shared UI kit: icons, buttons, form fields, modal, toasts, confirm dialog
   ========================================================================== */

/* ---------- icons (24px stroke set) ---------- */
const P = {
  dashboard: ['r:3,3,7,9,1', 'r:14,3,7,5,1', 'r:14,12,7,9,1', 'r:3,16,7,5,1'],
  trophy: ['M6 9H4.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16', 'M10 14.66V17c0 .55-.47.98-1.97 1.21C7.85 18.75 7 20.24 7 22', 'M14 14.66V17c0 .55.47.98 1.97 1.21C16.15 18.75 17 20.24 17 22', 'M18 2H6v7a6 6 0 0 0 12 0V2Z'],
  calendar: ['r:3,4,18,18,2', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  bracket: ['M4 5h5v5H4z', 'M4 14h5v5H4z', 'M9 7.5h3v9H9', 'M12 12h3', 'M15 9.5h5v5h-5z'],
  gamepad: ['M6 11h4', 'M8 9v4', 'M15 12h.01', 'M18 10h.01', 'M17.32 5H6.68a4 4 0 0 0-3.978 3.59C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258A4 4 0 0 0 17.32 5z'],
  home: ['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'c:9,7,4', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'c:12,7,4'],
  clipboard: ['r:8,2,8,4,1', 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'm9 14 2 2 4-4'],
  pen: ['M12 20h9', 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z'],
  file: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4', 'M10 9H8', 'M16 13H8', 'M16 17H8'],
  slides: ['r:2,3,20,14,2', 'M8 21h8', 'M12 17v4', 'm9 12 2-2 2 2 3-3'],
  menu: ['M4 12h16', 'M4 6h16', 'M4 18h16'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  sun: ['c:12,12,4', 'M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'],
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
  plus: ['M5 12h14', 'M12 5v14'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm17 8-5-5-5 5', 'M12 3v12'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
  edit: ['M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'],
  trash: ['M3 6h18', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2', 'M10 11v6', 'M14 11v6'],
  check: ['M20 6 9 17l-5-5'],
  checkCircle: ['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'm9 11 3 3L22 4'],
  search: ['c:11,11,8', 'm21 21-4.3-4.3'],
  medal: ['M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15', 'M11 12 5.12 2.2', 'm13 12 5.88-9.8', 'M8 7h8', 'c:12,17,5', 'M12 18v-2h-.5'],
  award: ['m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526', 'c:12,8,6'],
  lock: ['r:3,11,18,11,2', 'M7 11V7a5 5 0 0 1 10 0v4'],
  mail: ['r:2,4,20,16,2', 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'],
  eye: ['M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z', 'c:12,12,3'],
  eyeOff: ['M9.88 9.88a3 3 0 1 0 4.24 4.24', 'M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68', 'M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61', 'm2 2 20 20'],
  shield: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'],
  crown: ['M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z', 'M5 21h14'],
  info: ['c:12,12,10', 'M12 16v-4', 'M12 8h.01'],
  alert: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
  trend: ['M22 7 13.5 15.5 8.5 10.5 2 17', 'M16 7h6v6'],
  inbox: ['M22 12h-6l-2 3h-4l-2-3H2', 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z'],
  sparkle: ['m12 3-1.9 5.8a2 2 0 0 1-1.29 1.29L3 12l5.8 1.9a2 2 0 0 1 1.29 1.29L12 21l1.9-5.8a2 2 0 0 1 1.29-1.29L21 12l-5.8-1.9a2 2 0 0 1-1.29-1.29Z'],
  refresh: ['M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', 'M8 16H3v5'],
  flag: ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22v-7'],
  image: ['r:3,3,18,18,2', 'c:9,9,2', 'm21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21'],
};

export function Icon({ n, s = 18, className, style }) {
  const parts = P[n] || [];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      {parts.map((d, i) => {
        if (d.startsWith('r:')) { const [x, y, w, h, r] = d.slice(2).split(',').map(Number); return <rect key={i} x={x} y={y} width={w} height={h} rx={r || 0} />; }
        if (d.startsWith('c:')) { const [cx, cy, r] = d.slice(2).split(',').map(Number); return <circle key={i} cx={cx} cy={cy} r={r} />; }
        return <path key={i} d={d} />;
      })}
    </svg>
  );
}

/* ---------- toasts + busy overlay + confirm dialog (callable from anywhere) ---------- */
let pushToast = null, setBusyFn = null, askConfirm = null;
export function toast(m, err) { if (pushToast) pushToast(m, !!err); }
export function busy(b) { if (setBusyFn) setBusyFn(!!b); }
/** await confirmDialog('Delete this?', { title, confirm: 'Delete', danger: true }) -> true / false */
export function confirmDialog(message, o = {}) {
  return new Promise((res) => { if (askConfirm) askConfirm({ message, ...o, res }); else res(window.confirm(message)); });
}

export function Overlay() {
  const [list, setList] = useState([]);
  const [b, setB] = useState(false);
  const [cf, setCf] = useState(null);
  useEffect(() => {
    pushToast = (m, e) => {
      const id = Math.random();
      setList((l) => [...l.slice(-3), { id, m, e }]);
      setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), e ? 5500 : 2800);
    };
    setBusyFn = setB;
    askConfirm = setCf;
    return () => { pushToast = null; setBusyFn = null; askConfirm = null; };
  }, []);
  const close = (v) => { if (cf) cf.res(v); setCf(null); };
  return (
    <>
      <div className="toasts" aria-live="polite">
        {list.map((t) => <div key={t.id} className={'toast' + (t.e ? ' err' : '')}><Icon n={t.e ? 'alert' : 'checkCircle'} />{t.m}</div>)}
      </div>
      {b && <div className="busy"><div><span className="spin" />Please wait…</div></div>}
      {cf && (
        <Modal title={cf.title || 'Please confirm'} onClose={() => close(false)} width={440}
          footer={<>
            <Btn variant="ghost" onClick={() => close(false)}>Cancel</Btn>
            <Btn variant={cf.danger === false ? undefined : 'danger'} onClick={() => close(true)}>{cf.confirm || 'Delete'}</Btn>
          </>}>
          <p style={{ color: 'var(--muted)' }}>{cf.message}</p>
        </Modal>
      )}
    </>
  );
}

/* ---------- modal ---------- */
export function Modal({ title, children, onClose, width, footer }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    document.addEventListener('keydown', k);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" style={width ? { width: 'min(' + width + 'px,100%)' } : undefined}>
        <div className="sheet-h"><h3>{title}</h3>{onClose && <button className="icon-btn sm" onClick={onClose} aria-label="Close"><Icon n="x" s={16} /></button>}</div>
        <div className="sheet-b">{children}</div>
        {footer && <div className="sheet-f">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- primitives ---------- */
export function Btn({ variant, size, icon, loading, block, className = '', children, ...p }) {
  const cls = ['btn', variant, size, block && 'block', className].filter(Boolean).join(' ');
  return <button className={cls} {...p} disabled={p.disabled || loading}>{loading ? <span className="spin" /> : icon ? <Icon n={icon} s={size === 'sm' ? 14 : 16} /> : null}{children}</button>;
}
export const IconBtn = ({ icon, label, cls = '', ...p }) => <button className={'icon-btn ' + cls} aria-label={label} title={label} {...p}><Icon n={icon} s={cls.includes('sm') ? 15 : 18} /></button>;

export function Field({ label, hint, children, err }) {
  return <label className="field">{label && <span className="l">{label}</span>}{children}{hint && <div className={'hint' + (err ? ' err' : '')}>{hint}</div>}</label>;
}
export function Check({ checked, onChange, disabled, children }) {
  return (
    <label className="check">
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={onChange} />
      <span className="box"><Icon n="check" s={13} style={{ strokeWidth: 3.4 }} /></span>
      {children}
    </label>
  );
}
/** <option> list helper: list = [[value,label],...] */
export function Opts({ list, blank }) {
  return (
    <>
      {blank != null && <option value="">{blank}</option>}
      {list.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
    </>
  );
}
export function Select({ label, hint, list, blank, ...p }) {
  return <Field label={label} hint={hint}><select className="select" {...p}><Opts list={list} blank={blank} /></select></Field>;
}
export function Search({ value, onChange, placeholder = 'Search…' }) {
  return <div className="input-ico"><Icon n="search" s={16} /><input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div>;
}

export const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('');
export const Avatar = ({ name, size = '' }) => <span className={'avatar ' + size}>{initials(name)}</span>;
export const Badge = ({ tone = '', children }) => <span className={'badge ' + tone}>{children}</span>;
export const Dot = ({ color }) => <span className="dot" style={{ background: color || '#2563eb' }} />;

export function Card({ title, sub, actions, children, flush, className = '', style }) {
  return (
    <section className={'card' + (flush ? ' flush' : '') + ' ' + className} style={style}>
      {(title || actions) && <div className="card-h" style={flush ? { padding: '18px 20px 0', marginBottom: 14 } : undefined}><h3>{title}{sub && <div className="sub">{sub}</div>}</h3>{actions}</div>}
      {children}
    </section>
  );
}
export function PageHeader({ title, sub, children }) {
  return <div className="ph"><div className="ph-t"><h2>{title}</h2>{sub && <p>{sub}</p>}</div>{children && <div className="ph-a">{children}</div>}</div>;
}
export function Empty({ icon = 'inbox', title, children }) {
  return <div className="empty"><Icon n={icon} s={42} /><b>{title}</b>{children}</div>;
}
export function Note({ children, tone, icon = 'info' }) {
  return <div className={'note ' + (tone || '')}><Icon n={icon} s={18} /><div>{children}</div></div>;
}

/** run an async action, show errors as a red toast */
export async function attempt(fn, okMsg) {
  try { const r = await fn(); if (okMsg) toast(okMsg); return r === undefined ? true : r; }
  catch (e) { toast(e.message || String(e), true); return false; }
}
