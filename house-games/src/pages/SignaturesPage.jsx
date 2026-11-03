import { useState } from 'react';
import { useApp } from '../state.jsx';
import SigDialog from './SigDialog.jsx';
import { Avatar, Btn, Card, Empty, PageHeader, attempt, confirmDialog } from '../ui.jsx';
import { deleteSignature } from '../lib/api.js';

export default function SignaturesPage() {
  const { ME, D, H, reload } = useApp();
  const [dlg, setDlg] = useState(null);
  const roles = [['gamemaster', 'Game Master'], ['principal', 'Principal']];
  const remove = async (id) => {
    if (!(await confirmDialog('Remove this signature? Certificates will print a blank signing line instead.', { title: 'Remove signature?', confirm: 'Remove' }))) return;
    await attempt(async () => { await deleteSignature(id); await reload(); }, 'Signature removed.');
  };
  return (
    <>
      <PageHeader title="Signatures" sub="Printed above the signing lines on certificates. Upload a photo or scan of a signature on plain paper (the background is removed automatically) or draw it on screen." />
      <div className="grid g2" style={{ alignItems: 'start' }}>
        {roles.map((r) => {
          const us = D.Users.filter((u) => u.role === r[0] && (ME.role === 'admin' || u.id === ME.id));
          return (
            <Card key={r[0]} title={r[1]}>
              {!us.length && <Empty icon="pen" title={'No ' + r[1].toLowerCase() + ' available'}>{ME.role === 'admin' ? 'Create one on the Users page, then add the signature here.' : 'Only the ' + r[1].toLowerCase() + ' (or the administrator) can add this signature.'}</Empty>}
              {us.map((u) => {
                const sg = H.sigOf(u.id);
                return (
                  <div key={u.id} style={{ marginBottom: 16 }}>
                    <div className="who"><Avatar name={u.name} /><div><b>{u.name}</b><small>{u.email}</small></div></div>
                    <div className="sgbox">{sg ? <img src={sg.data} alt="signature" /> : 'No signature yet'}</div>
                    <div className="bar" style={{ marginTop: 10 }}>
                      <Btn size="sm" icon="pen" onClick={() => setDlg(u.id)}>{sg ? 'Change signature' : 'Add signature'}</Btn>
                      {sg && <Btn size="sm" variant="danger" className="soft" icon="trash" onClick={() => remove(u.id)}>Remove</Btn>}
                    </div>
                  </div>
                );
              })}
            </Card>
          );
        })}
      </div>
      {dlg && <SigDialog uid={dlg} onClose={() => setDlg(null)} />}
    </>
  );
}
