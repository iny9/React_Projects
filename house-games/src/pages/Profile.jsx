import { useState } from 'react';
import { useApp } from '../state.jsx';
import { ROLE_LABEL, SIGR } from '../lib/constants.js';
import { changePassword } from '../lib/api.js';
import { Avatar, Badge, Btn, Card, Field, Icon, PageHeader, attempt } from '../ui.jsx';
import SigDialog from './SigDialog.jsx';

export default function Profile() {
  const { ME, H } = useApp();
  const [op, setOp] = useState('');
  const [np, setNp] = useState('');
  const [dlg, setDlg] = useState(false);
  const [saving, setSaving] = useState(false);
  const sg = H.sigOf(ME.id);

  const update = async () => {
    setSaving(true);
    const ok = await attempt(() => changePassword(op, ME.email, np), 'Password updated.');
    setSaving(false);
    if (ok) { setOp(''); setNp(''); }
  };
  return (
    <>
      <PageHeader title="My profile" sub="Your account details, password and signature." />
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <Card>
          <div className="prof">
            <Avatar name={ME.name} size="lg" />
            <div><h3>{ME.name}</h3><p>{ME.email}</p><Badge tone="gold"><Icon n="shield" s={12} />{ROLE_LABEL[ME.role] || ME.role}</Badge></div>
          </div>
          <h3 style={{ font: '700 1rem var(--font)', marginBottom: 14 }}>Change password</h3>
          <Field label="Current password"><input className="input" type="password" autoComplete="current-password" value={op} onChange={(e) => setOp(e.target.value)} /></Field>
          <Field label="New password (min 6 characters)"><input className="input" type="password" autoComplete="new-password" value={np} onChange={(e) => setNp(e.target.value)} /></Field>
          <Btn icon="lock" loading={saving} onClick={update}>Update password</Btn>
        </Card>
        {SIGR.indexOf(ME.role) >= 0 && (
          <Card title="My signature" sub="Printed on certificates. The picture background is removed automatically.">
            <div className="sgbox">{sg ? <img src={sg.data} alt="signature" /> : 'No signature uploaded yet'}</div>
            <div className="bar" style={{ marginTop: 14 }}><Btn icon="pen" onClick={() => setDlg(true)}>{sg ? 'Change signature' : 'Add signature'}</Btn></div>
            {dlg && <SigDialog uid={ME.id} onClose={() => setDlg(false)} />}
          </Card>
        )}
      </div>
    </>
  );
}
