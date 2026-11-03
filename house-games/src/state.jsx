import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase.js';
import { loadAll, loadProfile, signOut } from './lib/api.js';
import { makeHelpers } from './lib/helpers.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);
const EMPTY = { Users: [], Years: [], Games: [], Houses: [], Students: [], Entries: [], Matches: [], Results: [], Signatures: [] };

export function AppProvider({ children }) {
  const [session, setSession] = useState(undefined);   // undefined = still checking
  const [recovery, setRecovery] = useState(false);     // arrived from a password-reset e-mail
  const [ME, setME] = useState(null);
  const [D, setD] = useState(EMPTY);
  const [YEAR, setYearState] = useState(() => { try { return localStorage.getItem('hg_year') || ''; } catch (e) { return ''; } });
  const [sgSel, setSgSel] = useState({ gamemaster: '', principal: '' });
  const [theme, setThemeState] = useState(() => { try { return localStorage.getItem('hg_theme') || 'light'; } catch (e) { return 'light'; } });
  const [bootError, setBootError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  const setTheme = (t) => { setThemeState(t); try { localStorage.setItem('hg_theme', t); } catch (e) { /* ignore */ } };
  const setYEAR = (y) => { setYearState(y); try { localStorage.setItem('hg_year', y); } catch (e) { /* ignore */ } };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((ev, s) => {
      if (ev === 'PASSWORD_RECOVERY') setRecovery(true);
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    const d = await loadAll();
    setD(d);
    setYearState((cur) => {
      if (cur && d.Years.some((y) => y.id === cur)) return cur;
      const a = d.Years.filter((y) => y.active)[0] || d.Years[d.Years.length - 1];
      return a ? a.id : '';
    });
    return d;
  }, []);

  const uid = session && session.user ? session.user.id : null;
  useEffect(() => {
    let dead = false;
    if (!uid) { setME(null); setD(EMPTY); setReady(false); return; }
    (async () => {
      try {
        setBootError('');
        const p = await loadProfile(uid);
        if (!p) throw new Error('No profile was found for this account. Ask the administrator to check the database set-up.');
        await reload();
        if (!dead) { setME(p); setReady(true); }
      } catch (e) { if (!dead) setBootError(e.message || String(e)); }
    })();
    return () => { dead = true; };
  }, [uid, reload]);

  const H = useMemo(() => makeHelpers({ D, YEAR, ME, SGSEL: sgSel }), [D, YEAR, ME, sgSel]);
  const logout = async () => { await signOut(); setME(null); setReady(false); };

  const value = { session, recovery, setRecovery, ME, D, YEAR, setYEAR, reload, H, sgSel, setSgSel, theme, setTheme, bootError, ready, logout };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
