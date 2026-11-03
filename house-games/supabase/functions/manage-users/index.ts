// Supabase Edge Function: manage-users
// Creates, edits and deletes login accounts. It runs on the server with the
// service-role key (which must never reach the browser) and checks WHO is asking:
//   • admin       – may manage every role
//   • game master – may manage house masters only
// Deploy:  supabase functions deploy manage-users
import { createClient } from 'npm:@supabase/supabase-js@2';

const ROLES = ['admin', 'gamemaster', 'housemaster', 'principal', 'board', 'student'];
const DEFAULT_PW = '12345678';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1. who is calling?
    const caller = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: u } = await caller.auth.getUser();
    if (!u?.user) return json({ error: 'Please log in again.' }, 401);

    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: me } = await admin.from('profiles').select('id, role').eq('id', u.user.id).single();
    if (!me || !['admin', 'gamemaster'].includes(me.role)) {
      return json({ error: 'You do not have permission to do this.' }, 403);
    }
    // may the caller manage a user with this role?
    const may = (role: string) => me.role === 'admin' || (me.role === 'gamemaster' && role === 'housemaster');

    const b = await req.json();
    const email = String(b.email ?? '').trim().toLowerCase();
    const name = String(b.name ?? '').trim();
    const role = String(b.role ?? '');

    // ---- create ----
    if (b.action === 'create') {
      if (!ROLES.includes(role)) return json({ error: 'Invalid role.' }, 400);
      if (!may(role)) return json({ error: 'You do not have permission to create this kind of user.' }, 403);
      if (!name || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'A name and a valid email are required.' }, 400);
      const password = String(b.password || DEFAULT_PW);
      if (password.length < 6) return json({ error: 'The password must have at least 6 characters.' }, 400);

      const { data: created, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { name },
      });
      if (error) return json({ error: /already/i.test(error.message) ? 'That email is already used.' : error.message }, 400);
      // the database trigger made the profile (role "student"); set the real role and name
      const { error: e2 } = await admin.from('profiles').update({ role, name }).eq('id', created.user!.id);
      if (e2) return json({ error: e2.message }, 400);
      return json({ ok: true, id: created.user!.id });
    }

    // ---- update / delete need an existing target ----
    const { data: target } = await admin.from('profiles').select('id, role, email').eq('id', b.id).single();
    if (!target) return json({ error: 'User not found.' }, 404);
    if (!may(target.role)) return json({ error: 'You do not have permission to change this user.' }, 403);

    if (b.action === 'update') {
      if (!ROLES.includes(role) || !may(role)) return json({ error: 'You do not have permission to give that role.' }, 403);
      if (!name || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'A name and a valid email are required.' }, 400);
      if (target.id === me.id && role !== me.role) return json({ error: 'You cannot change your own role.' }, 400);
      const upd: Record<string, unknown> = { email, user_metadata: { name } };
      if (b.password) {
        if (String(b.password).length < 6) return json({ error: 'The password must have at least 6 characters.' }, 400);
        upd.password = String(b.password);
      }
      const { error } = await admin.auth.admin.updateUserById(target.id, upd);
      if (error) return json({ error: /already/i.test(error.message) ? 'That email is already used.' : error.message }, 400);
      const { error: e2 } = await admin.from('profiles').update({ role, name, email }).eq('id', target.id);
      if (e2) return json({ error: e2.message }, 400);
      return json({ ok: true });
    }

    if (b.action === 'delete') {
      if (target.id === me.id) return json({ error: 'You cannot delete your own account.' }, 400);
      const { error } = await admin.auth.admin.deleteUser(target.id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Unexpected error.' }, 500);
  }
});
