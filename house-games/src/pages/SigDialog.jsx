import { useEffect, useRef, useState } from 'react';
import { useApp } from '../state.jsx';
import { sigProcess } from '../lib/signature.js';
import { deleteSignature, saveSignature } from '../lib/api.js';
import { Btn, Field, Icon, Modal, attempt, confirmDialog, toast } from '../ui.jsx';

/** Add / change a signature: upload a photo or draw it on screen. */
export default function SigDialog({ uid, onClose }) {
  const { ME, D, H, reload } = useApp();
  const u = uid === ME.id ? ME : D.Users.filter((x) => x.id === uid)[0];
  const cur = H.sigOf(uid);
  const [mode, setMode] = useState('up');
  const [img, setImg] = useState(null);       // HTMLImageElement or the drawing canvas
  const [stamp, setStamp] = useState(0);      // bump to re-run after drawing
  const [sens, setSens] = useState(50);
  const [ink, setInk] = useState('blue');
  const [out, setOut] = useState({ url: '', msg: 'Choose or draw a signature first' });
  const pad = useRef(null);
  const st = useRef({ d: false, x: 0, y: 0, ink: false });

  useEffect(() => {
    if (!img) return;
    try { const r = sigProcess(img, { sens, ink }); setOut({ url: r.url, msg: '' }); }
    catch (e) { setOut({ url: '', msg: e.message }); toast(e.message, true); }
  }, [img, stamp, sens, ink]);

  /* ---- drawing pad ---- */
  const clearPad = () => {
    const c = pad.current; if (!c) return;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.lineWidth = 4; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#111';
    st.current = { d: false, x: 0, y: 0, ink: false };
  };
  useEffect(() => { if (mode === 'draw') clearPad(); }, [mode]);
  const pt = (e) => { const c = pad.current, r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; };
  const down = (e) => {
    e.preventDefault();
    try { pad.current.setPointerCapture(e.pointerId); } catch (z) { /* ignore */ }
    const x = pad.current.getContext('2d'), p = pt(e);
    st.current = { d: true, x: p[0], y: p[1], ink: true };
    x.beginPath(); x.fillStyle = '#111'; x.arc(p[0], p[1], 2, 0, 6.3); x.fill();
  };
  const move = (e) => {
    if (!st.current.d) return;
    e.preventDefault();
    const x = pad.current.getContext('2d'), p = pt(e);
    x.beginPath(); x.moveTo(st.current.x, st.current.y); x.lineTo(p[0], p[1]); x.stroke();
    st.current.x = p[0]; st.current.y = p[1];
  };
  const up = () => { st.current.d = false; };
  const useDrawing = () => {
    if (!st.current.ink) return toast('Draw your signature in the box first.', true);
    setImg(pad.current); setStamp((n) => n + 1);
  };

  /* ---- upload ---- */
  const pick = (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) return toast('Please choose an image file.', true);
    if (f.size > 10 * 1024 * 1024) return toast('The picture is larger than 10 MB.', true);
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => setImg(im);
      im.onerror = () => toast('The picture could not be read.', true);
      im.src = fr.result;
    };
    fr.readAsDataURL(f);
  };

  const save = async () => {
    const ok = await attempt(async () => { await saveSignature(uid, out.url); await reload(); }, 'Signature saved.');
    if (ok) onClose();
  };
  const remove = async () => {
    if (!(await confirmDialog('Remove this signature?', { title: 'Remove signature?', confirm: 'Remove' }))) return;
    const ok = await attempt(async () => { await deleteSignature(uid); await reload(); }, 'Signature removed.');
    if (ok) onClose();
  };
  if (!u) return null;

  return (
    <Modal title={'Signature · ' + u.name} onClose={onClose} width={640}
      footer={<>
        {cur && <Btn variant="danger" className="soft" icon="trash" onClick={remove} style={{ marginRight: 'auto' }}>Remove</Btn>}
        <Btn variant="ghost" onClick={onClose}>Close</Btn>
        <Btn icon="check" disabled={!out.url} onClick={save}>Save signature</Btn>
      </>}>
      <Field label="Current signature"><div className="sgbox">{cur ? <img src={cur.data} alt="current signature" /> : 'None yet'}</div></Field>
      <div className="seg" style={{ marginBottom: 14 }}>
        <button className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}><Icon n="upload" s={15} />Upload picture</button>
        <button className={mode === 'draw' ? 'on' : ''} onClick={() => setMode('draw')}><Icon n="pen" s={15} />Draw signature</button>
      </div>
      {mode === 'up' ? (
        <Field label="Photo or scan" hint="Sign on plain white paper, take a clear photo or scan, and upload it. The background is removed and the signature is trimmed.">
          <input className="input" type="file" accept="image/*" onChange={pick} />
        </Field>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <p className="hint" style={{ marginBottom: 8 }}>Sign inside the box with your finger, a stylus or the mouse, then press “Use this drawing”.</p>
          <canvas id="sgpad" ref={pad} width="720" height="260" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
          <div className="bar" style={{ marginTop: 8 }}>
            <Btn variant="ghost" size="sm" onClick={clearPad}>Clear</Btn>
            <Btn size="sm" icon="check" onClick={useDrawing}>Use this drawing</Btn>
          </div>
        </div>
      )}
      <div className="row" style={{ marginBottom: 14 }}>
        <Field label="Background removal strength"><input type="range" min="0" max="100" value={sens} onChange={(e) => setSens(+e.target.value)} /></Field>
        <Field label="Ink colour"><select className="select" value={ink} onChange={(e) => setInk(e.target.value)}><option value="blue">Blue-black</option><option value="black">Black</option></select></Field>
      </div>
      <Field label="Cleaned preview (chequered = transparent)"><div className="sgbox">{out.url ? <img src={out.url} alt="cleaned signature" /> : out.msg}</div></Field>
    </Modal>
  );
}
