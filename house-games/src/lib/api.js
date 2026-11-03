/* All talking to Supabase happens here. Pages never call supabase directly. */
import { supabase } from './supabase.js';

/* ---- snake_case (database) <-> camelCase (app) ---- */
const camel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const snake = (s) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
export const toCamel = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [camel(k), v]));
export const toSnake = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [snake(k), v]));

/** turn database errors into plain sentences */
function friendly(err) {
  const msg = (err && err.message) || String(err);
  if (/row-level security/i.test(msg)) return 'You do not have permission to do this.';
  if (err && err.code === '23505') return 'That record already exists.';
  if (err && err.code === '23503') return 'That record is linked to other data.';
  if (/JWT|not authenticated/i.test(msg)) return 'Your session has expired. Please log in again.';
  return msg;
}
async function run(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(friendly(error));
  return data;
}

/** Supabase returns at most 1000 rows per request, so read in pages. */
async function fetchAll(table) {
  let out = [], from = 0;
  for (;;) {
    const rows = await run(supabase.from(table).select('*').order('id').range(from, from + 999));
    out = out.concat(rows);
    if (rows.length < 1000) break;
    from += 1000;
  }
  return out.map(toCamel);
}

export async function loadAll() {
  const names = ['profiles', 'years', 'games', 'houses', 'students', 'entries', 'matches', 'results', 'signatures'];
  const res = await Promise.all(names.map(fetchAll));
  const D = {};
  names.forEach((n, i) => { D[n] = res[i]; });
  return {
    Users: D.profiles, Years: D.years, Games: D.games, Houses: D.houses, Students: D.students,
    Entries: D.entries, Matches: D.matches, Results: D.results, Signatures: D.signatures,
  };
}

export async function loadProfile(uid) {
  const r = await run(supabase.from('profiles').select('*').eq('id', uid).maybeSingle());
  return r ? toCamel(r) : null;
}

/* columns each table accepts from the forms */
const FIELDS = {
  years: ['name', 'active'],
  games: ['year', 'name', 'male', 'female', 'maxM', 'maxF', 'format'],
  houses: ['year', 'name', 'color', 'masterEmail'],
  students: ['year', 'name', 'age', 'cls', 'gender', 'houseId'],
  entries: ['year', 'gameId', 'category', 'studentId', 'houseId'],
};
function clean(table, row) {
  const o = {};
  FIELDS[table].forEach((f) => { if (row[f] !== undefined) o[f] = row[f]; });
  if ('age' in o) o.age = o.age === '' || o.age == null ? null : Number(o.age);
  ['male', 'female', 'active'].forEach((f) => { if (f in o) o[f] = !!Number(o[f]) || o[f] === true; });
  ['maxM', 'maxF'].forEach((f) => { if (f in o) o[f] = Number(o[f]) || 0; });
  if ('name' in o) o.name = String(o.name).trim();
  if ('masterEmail' in o) o.masterEmail = String(o.masterEmail || '').trim().toLowerCase();
  return toSnake(o);
}
export async function saveRow(table, row) {
  const body = clean(table, row);
  if (row.id) return run(supabase.from(table).update(body).eq('id', row.id).select().single());
  return run(supabase.from(table).insert(body).select().single());
}
export const insertMany = (table, rows) => run(supabase.from(table).insert(rows.map((r) => clean(table, r))));
export const deleteRow = (table, id) => run(supabase.from(table).delete().eq('id', id));

/* ---- stored functions (see supabase/schema.sql) ---- */
export const rpc = (fn, args) => run(supabase.rpc(fn, args));
export const saveEntries = (gameId, category, studentIds) =>
  rpc('save_entries', { p_game: gameId, p_category: category, p_students: studentIds });
export const genFixtures = (gameId, category, houses) =>
  rpc('gen_fixtures', { p_game: gameId, p_category: category, p_houses: houses });
export const setWinner = (matchId, winner) => rpc('set_winner', { p_match: matchId, p_winner: winner || null });
export const setResults = (gameId, category, order) =>
  rpc('set_results', { p_game: gameId, p_category: category, p_order: order.map((x) => x || null) });
export const clearGame = (gameId) => rpc('clear_game', { p_game: gameId });
export const saveSignature = (userId, data) => rpc('save_signature', { p_user: userId || null, p_data: data });
export const deleteSignature = (userId) => rpc('delete_signature', { p_user: userId || null });

/* ---- users (login accounts) go through the manage-users Edge Function ---- */
export async function manageUser(body) {
  const { data, error } = await supabase.functions.invoke('manage-users', { body });
  if (error) {
    let m = error.message;
    try { const j = await error.context.json(); if (j && j.error) m = j.error; } catch (_) { /* keep m */ }
    throw new Error(m);
  }
  if (data && data.error) throw new Error(data.error);
  return data;
}

/* ---- auth ---- */
export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(/invalid login/i.test(error.message) ? 'Wrong email or password.' : error.message);
}
export const signOut = () => supabase.auth.signOut();
export async function sendReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + window.location.pathname });
  if (error) throw new Error(error.message);
}
export async function changePassword(current, email, next) {
  if (String(next || '').length < 6) throw new Error('The new password must have at least 6 characters.');
  const { error: e1 } = await supabase.auth.signInWithPassword({ email, password: current });
  if (e1) throw new Error('The current password is wrong.');
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) throw new Error(error.message);
}
export async function setNewPassword(next) {
  if (String(next || '').length < 6) throw new Error('The new password must have at least 6 characters.');
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) throw new Error(error.message);
}
