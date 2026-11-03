import { useEffect, useState } from 'react';
import { configured } from './lib/supabase.js';
import { useApp } from './state.jsx';
import { LOGO } from './lib/logo.js';
import { ROLE_LABEL, SIGR } from './lib/constants.js';
import { Avatar, Btn, Field, Icon, IconBtn, Note, attempt, toast } from './ui.jsx';
import { sendReset, setNewPassword, signIn } from './lib/api.js';
import Dashboard from './pages/Dashboard.jsx';
import CrudPage from './pages/CrudPage.jsx';
import EntriesPanel from './pages/EntriesPanel.jsx';
import Fixtures from './pages/Fixtures.jsx';
import SignaturesPage from './pages/SignaturesPage.jsx';
import Reports from './pages/Reports.jsx';
import Profile from './pages/Profile.jsx';

/* ---------- auth screens ---------- */
function AuthLayout({ children }) {
  return (
    <div className="auth">
      <aside className="auth-hero">
        <span className="orb" style={{ width: 90, height: 90, right: '14%', top: '18%' }} />
        <span className="orb" style={{ width: 54, height: 54, right: '34%', top: '58%', animationDelay: '-2s' }} />
        <span className="orb" style={{ width: 120, height: 120, left: '58%', bottom: '8%', animationDelay: '-4s' }} />
        <div>
          <img className="logo" src={LOGO} alt="Baptist Academy crest" />
          <h1>House Games Championship</h1>
          <p>Baptist Academy Jimeta Yola · Strive for Excellence. Fixtures, live standings, entries and certificates — all in one place.</p>
        </div>
        <div className="feat">
          <div><Icon n="trophy" s={16} />Live standings</div>
          <div><Icon n="bracket" s={16} />Knock-out brackets</div>
          <div><Icon n="award" s={16} />Certificates</div>
        </div>
      </aside>
      <main className="auth-form">{children}</main>
    </div>
  );
}

function Boot({ children }) {
  return <div className="boot"><img src={LOGO} alt="" /><span className="spin" />{children}</div>;
}

function SetupNeeded() {
  return (
    <AuthLayout>
      <div className="auth-box">
        <h2>Almost there</h2>
        <p>The app is not connected to Supabase yet.</p>
        <Note icon="alert" tone="bad">Create a file named <b>.env</b> next to <b>package.json</b>, copy the two lines from <b>.env.example</b>, fill in your project URL and anon key, then restart <b>npm run dev</b>. On a host such as Netlify or Vercel, add the same two values as environment variables and redeploy.</Note>
      </div>
    </AuthLayout>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const go = async () => { setLoading(true); await attempt(() => signIn(email, pw)); setLoading(false); };
  const forgot = () => {
    if (!email) return toast('Enter your email address first.', true);
    attempt(() => sendReset(email), 'If that email exists, a reset link has been sent.');
  };
  return (
    <AuthLayout>
      <div className="auth-box">
        <h2>Welcome back</h2>
        <p>Sign in to manage the championship.</p>
        <Field label="Email address">
          <div className="input-ico"><Icon n="mail" s={16} /><input className="input" type="email" autoComplete="username" placeholder="you@school.edu.ng" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        </Field>
        <Field label="Password">
          <div className="input-ico"><Icon n="lock" s={16} />
            <input className="input" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') go(); }} />
            <span className="eye"><IconBtn icon={show ? 'eyeOff' : 'eye'} label={show ? 'Hide password' : 'Show password'} cls="sm" style={{ border: 0, background: 'transparent' }} onClick={(e) => { e.preventDefault(); setShow(!show); }} /></span>
          </div>
        </Field>
        <Btn block size="lg" loading={loading} onClick={go} style={{ marginTop: 6 }}>Sign in</Btn>
        <div style={{ textAlign: 'center', marginTop: 18 }}><button className="btn ghost sm" onClick={forgot} style={{ border: 0 }}>Forgot password?</button></div>
      </div>
    </AuthLayout>
  );
}

function NewPassword() {
  const { setRecovery } = useApp();
  const [a, setA] = useState('');
  const save = async () => { if (await attempt(() => setNewPassword(a), 'Password updated.')) setRecovery(false); };
  return (
    <AuthLayout>
      <div className="auth-box">
        <h2>Choose a new password</h2>
        <p>Use at least 6 characters.</p>
        <Field label="New password"><input className="input" type="password" value={a} onChange={(e) => setA(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); }} /></Field>
        <Btn block size="lg" onClick={save}>Save password</Btn>
      </div>
    </AuthLayout>
  );
}

/* ---------- main shell ---------- */
function buildNav(role) {
  const g = [
    ['Overview', [['dash', 'Dashboard', 'dashboard'], ['fix', 'Fixtures & Results', 'bracket']]],
    ['Manage', []],
    ['Output', []],
    ['Account', [['me', 'Profile', 'user']]],
  ];
  const m = g[1][1];
  if (role === 'admin') m.push(['Years', 'Competition Years', 'calendar']);
  if (role === 'admin' || role === 'gamemaster') m.push(['Users', 'Users', 'shield']);
  m.push(['Games', 'Games', 'gamepad'], ['Houses', 'Houses', 'home'], ['Students', 'Students', 'users'], ['Entries', 'Entries', 'clipboard']);
  const o = g[2][1];
  if (role === 'admin' || SIGR.indexOf(role) >= 0) o.push(['sig', 'Signatures', 'pen']);
  o.push(['rep', 'Reports & Certificates', 'file']);
  return g;
}

function Shell() {
  const { ME, D, YEAR, setYEAR, theme, setTheme, logout } = useApp();
  const [page, setPage] = useState('dash');
  const [open, setOpen] = useState(false);
  const groups = buildNav(ME.role);
  const all = groups.flatMap((g) => g[1]);
  const cur = all.find((p) => p[0] === page) || all[0];

  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  const go = (p) => { setPage(p); setOpen(false); };

  let body;
  if (page === 'dash') body = <Dashboard />;
  else if (page === 'fix') body = <Fixtures />;
  else if (page === 'sig') body = <SignaturesPage />;
  else if (page === 'rep') body = <Reports />;
  else if (page === 'me') body = <Profile />;
  else if (page === 'Entries') body = <><EntriesPanel key={YEAR} /><CrudPage t="Entries" key={'t' + YEAR} /></>;
  else body = <CrudPage t={page} key={page + YEAR} />;

  return (
    <div className="app">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={'side' + (open ? ' open' : '')}>
        <div className="side-brand"><img src={LOGO} alt="" /><div><b>House Games</b><small>Baptist Academy Jimeta</small></div></div>
        <nav className="side-scroll">
          {groups.map(([label, items]) => (
            <div className="nav-group" key={label}>
              <div className="nav-label">{label}</div>
              {items.map(([k, t, ic]) => (
                <button key={k} className={'nav-item' + (k === page ? ' on' : '')} onClick={() => go(k)}><Icon n={ic} s={18} />{t}</button>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <div className="me">
            <Avatar name={ME.name} />
            <div className="me-t"><b>{ME.name}</b><small>{ROLE_LABEL[ME.role] || ME.role}</small></div>
            <IconBtn icon="logout" label="Log out" cls="sm" onClick={logout} style={{ background: 'rgba(255,255,255,.08)', border: 0, color: '#c9d6f5' }} />
          </div>
        </div>
      </aside>
      <div className="content">
        <header className="top">
          <IconBtn icon="menu" label="Open menu" cls="burger" onClick={() => setOpen(true)} />
          <h1>{cur[1]}</h1>
          <div className="top-r">
            <select className="select year-sel" value={YEAR} onChange={(e) => setYEAR(e.target.value)} aria-label="Competition year">
              {D.Years.length === 0 && <option value="">No year yet</option>}
              {D.Years.map((y) => <option key={y.id} value={y.id}>{y.name}{y.active ? ' · active' : ''}</option>)}
            </select>
            <IconBtn icon={theme === 'light' ? 'moon' : 'sun'} label="Toggle light / dark mode" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} />
          </div>
        </header>
        <main className="page" key={page}>{body}</main>
      </div>
    </div>
  );
}

export default function App() {
  const { session, recovery, ready, bootError, logout } = useApp();
  if (!configured) return <SetupNeeded />;
  if (session === undefined) return <Boot>Loading…</Boot>;
  if (recovery) return <NewPassword />;
  if (!session) return <Login />;
  if (bootError) return (
    <AuthLayout><div className="auth-box">
      <h2>Could not load your data</h2><p>Something went wrong while opening your account.</p>
      <Note icon="alert" tone="bad">{bootError}</Note>
      <Btn variant="ghost" onClick={logout}>Log out</Btn>
    </div></AuthLayout>
  );
  if (!ready) return <Boot>Loading your data…</Boot>;
  return <Shell />;
}
