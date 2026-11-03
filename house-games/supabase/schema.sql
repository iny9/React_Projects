-- =====================================================================
-- House Games Championship – Supabase schema (v3)
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query
-- Safe to re-run on an empty project. (It does NOT drop any data.)
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- tables ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text not null default '',
  role       text not null default 'student'
             check (role in ('admin','gamemaster','housemaster','principal','board','student')),
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_email_uq on public.profiles (lower(email));

create table if not exists public.years (
  id     uuid primary key default gen_random_uuid(),
  name   text not null,
  active boolean not null default false
);

create table if not exists public.games (
  id     uuid primary key default gen_random_uuid(),
  year   uuid not null references public.years(id) on delete cascade,
  name   text not null,
  male   boolean not null default true,
  female boolean not null default true,
  max_m  int not null default 1,
  max_f  int not null default 1,
  format text not null default 'semi' check (format in ('quarter','semi','final'))
);

create table if not exists public.houses (
  id           uuid primary key default gen_random_uuid(),
  year         uuid not null references public.years(id) on delete cascade,
  name         text not null,
  color        text not null default '#2563eb',
  master_email text not null default ''
);

create table if not exists public.students (
  id       uuid primary key default gen_random_uuid(),
  year     uuid not null references public.years(id) on delete cascade,
  name     text not null,
  age      int,
  cls      text not null default '',
  gender   text not null check (gender in ('Male','Female')),
  house_id uuid not null references public.houses(id) on delete cascade
);

create table if not exists public.entries (
  id         uuid primary key default gen_random_uuid(),
  year       uuid not null references public.years(id) on delete cascade,
  game_id    uuid not null references public.games(id) on delete cascade,
  category   text not null check (category in ('Male','Female')),
  student_id uuid not null references public.students(id) on delete cascade,
  house_id   uuid not null references public.houses(id) on delete cascade,
  unique (game_id, category, student_id)
);

create table if not exists public.matches (
  id       uuid primary key default gen_random_uuid(),
  year     uuid not null references public.years(id) on delete cascade,
  game_id  uuid not null references public.games(id) on delete cascade,
  category text not null check (category in ('Male','Female')),
  round    text not null check (round in ('Q1','Q2','Q3','Q4','S1','S2','F','T')),
  h1       uuid references public.houses(id) on delete cascade,
  h2       uuid references public.houses(id) on delete cascade,
  winner   uuid references public.houses(id) on delete cascade,
  unique (game_id, category, round)
);

create table if not exists public.results (
  id       uuid primary key default gen_random_uuid(),
  year     uuid not null references public.years(id) on delete cascade,
  game_id  uuid not null references public.games(id) on delete cascade,
  category text not null check (category in ('Male','Female')),
  pos      int  not null check (pos between 1 and 4),
  house_id uuid not null references public.houses(id) on delete cascade,
  unique (game_id, category, pos),
  unique (game_id, category, house_id)
);

create table if not exists public.signatures (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  role    text not null,
  name    text not null,
  data    text not null check (data like 'data:image/png;base64,%' and length(data) <= 200000),
  updated bigint not null default 0
);

create index if not exists students_house_idx on public.students(house_id);
create index if not exists entries_game_idx   on public.entries(game_id, category);
create index if not exists matches_game_idx   on public.matches(game_id, category);
create index if not exists results_game_idx   on public.results(game_id, category);

-- ---------- helper functions (used by the security rules) ----------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.my_email() returns text
language sql stable security definer set search_path = public as
$$ select lower(email) from public.profiles where id = auth.uid() $$;

create or replace function public.is_gm() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.my_role() in ('admin','gamemaster'), false) $$;

create or replace function public.my_house_ids() returns setof uuid
language sql stable security definer set search_path = public as
$$ select id from public.houses where lower(master_email) = public.my_email() $$;

create or replace function public.can_edit_house(h uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select public.is_gm()
       or (public.my_role() = 'housemaster' and h in (select public.my_house_ids())) $$;

-- ---------- new auth user -> profile (the FIRST user ever becomes ADMIN) ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email,
          coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)),
          case when not exists (select 1 from public.profiles) then 'admin' else 'student' end)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep the e-mail in sync if it is changed in Auth
create or replace function public.sync_profile_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin update public.profiles set email = new.email where id = new.id; return new; end $$;
drop trigger if exists on_auth_user_email on auth.users;
create trigger on_auth_user_email after update of email on auth.users
  for each row when (old.email is distinct from new.email) execute function public.sync_profile_email();

-- the signature record follows the user record
create or replace function public.profile_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role in ('principal','gamemaster') then
    update public.signatures set name = new.name, role = new.role where user_id = new.id;
  else
    delete from public.signatures where user_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists profile_changed on public.profiles;
create trigger profile_changed after update of name, role on public.profiles
  for each row execute function public.profile_changed();

-- ---------- business-rule triggers ----------
-- the first year is always active
create or replace function public.years_first() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.years where id <> new.id) then new.active := true; end if;
  return new;
end $$;
drop trigger if exists years_first on public.years;
create trigger years_first before insert or update on public.years
  for each row execute function public.years_first();

-- only one year is active at a time
create or replace function public.years_single_active() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.active then update public.years set active = false where id <> new.id and active; end if;
  return null;
end $$;
drop trigger if exists years_single_active on public.years;
create trigger years_single_active after insert or update on public.years
  for each row execute function public.years_single_active();

-- games: categories, limits, format lock
create or replace function public.games_rules() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.name is null or btrim(new.name) = '' then raise exception 'Game name is required.'; end if;
  if not (new.male or new.female) then raise exception 'A game must exist for male, female or both.'; end if;
  new.max_m := case when new.male   then greatest(1, coalesce(new.max_m, 1)) else 0 end;
  new.max_f := case when new.female then greatest(1, coalesce(new.max_f, 1)) else 0 end;
  if tg_op = 'UPDATE' then
    if old.male and not new.male and
       (exists (select 1 from public.entries where game_id = new.id and category = 'Male')
        or exists (select 1 from public.results where game_id = new.id and category = 'Male')) then
      raise exception 'Cannot remove the Male category: it already has entries/results.';
    end if;
    if old.female and not new.female and
       (exists (select 1 from public.entries where game_id = new.id and category = 'Female')
        or exists (select 1 from public.results where game_id = new.id and category = 'Female')) then
      raise exception 'Cannot remove the Female category: it already has entries/results.';
    end if;
    if old.format <> new.format and
       (exists (select 1 from public.matches where game_id = new.id)
        or exists (select 1 from public.results where game_id = new.id)) then
      raise exception 'The format cannot be changed once fixtures or results exist. Use "Clear fixtures & results" on the Fixtures page first.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists games_rules on public.games;
create trigger games_rules before insert or update on public.games
  for each row execute function public.games_rules();

-- students: the year always follows the house
create or replace function public.students_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare h public.houses;
begin
  if new.name is null or btrim(new.name) = '' then raise exception 'Student name is required.'; end if;
  select * into h from public.houses where id = new.house_id;
  if not found then raise exception 'Select a house.'; end if;
  new.year := h.year;
  return new;
end $$;
drop trigger if exists students_rules on public.students;
create trigger students_rules before insert or update on public.students
  for each row execute function public.students_rules();

-- entries: gender, category, per-house limit, duplicates
create or replace function public.entries_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare g public.games; s public.students; mx int; cnt int; hname text;
begin
  select * into g from public.games where id = new.game_id;
  if not found then raise exception 'Select a game.'; end if;
  select * into s from public.students where id = new.student_id;
  if not found then raise exception 'Select a student.'; end if;
  if not ((new.category = 'Male' and g.male) or (new.category = 'Female' and g.female)) then
    raise exception 'This game has no % category.', new.category;
  end if;
  if s.gender <> new.category then
    raise exception '% does not match the % category.', s.name, new.category;
  end if;
  if s.year <> g.year then raise exception 'The student and the game belong to different years.'; end if;
  if exists (select 1 from public.entries
             where game_id = new.game_id and category = new.category and student_id = new.student_id
               and id <> new.id) then
    raise exception '% is already entered.', s.name;
  end if;
  new.house_id := s.house_id;
  new.year := g.year;
  mx := case when new.category = 'Male' then g.max_m else g.max_f end;
  select count(*) into cnt from public.entries
   where game_id = new.game_id and category = new.category and house_id = new.house_id and id <> new.id;
  if cnt >= mx then
    select name into hname from public.houses where id = new.house_id;
    raise exception '% can enter at most % participant(s) in this category.', hname, mx;
  end if;
  return new;
end $$;
drop trigger if exists entries_rules on public.entries;
create trigger entries_rules before insert or update on public.entries
  for each row execute function public.entries_rules();

-- ---------- row level security ----------
alter table public.profiles   enable row level security;
alter table public.years      enable row level security;
alter table public.games      enable row level security;
alter table public.houses     enable row level security;
alter table public.students   enable row level security;
alter table public.entries    enable row level security;
alter table public.matches    enable row level security;
alter table public.results    enable row level security;
alter table public.signatures enable row level security;

-- profiles: you see yourself; admin sees all; game master sees house masters.
-- (creating / editing / deleting users is done by the manage-users Edge Function)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.my_role() = 'admin'
         or (public.my_role() = 'gamemaster' and role = 'housemaster'));

-- everyone who is signed in can read the competition data
do $$ declare t text; begin
  foreach t in array array['years','games','houses','students','entries','matches','results','signatures'] loop
    execute format('drop policy if exists %I on public.%I', t||'_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t||'_select', t);
  end loop;
end $$;

-- years: admin only
drop policy if exists years_write on public.years;
create policy years_write on public.years for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- games & houses: admin / game master
drop policy if exists games_write on public.games;
create policy games_write on public.games for all to authenticated
  using (public.is_gm()) with check (public.is_gm());
drop policy if exists houses_write on public.houses;
create policy houses_write on public.houses for all to authenticated
  using (public.is_gm()) with check (public.is_gm());

-- students & entries: admin / game master, or the house master of THAT house
drop policy if exists students_write on public.students;
create policy students_write on public.students for all to authenticated
  using (public.can_edit_house(house_id)) with check (public.can_edit_house(house_id));
drop policy if exists entries_write on public.entries;
create policy entries_write on public.entries for all to authenticated
  using (public.can_edit_house(house_id)) with check (public.can_edit_house(house_id));

-- matches, results, signatures: written only through the functions below (no direct write policy)

-- ---------- functions called by the app ----------
-- Enter several students at once (all-or-nothing). Row level security + entries_rules apply.
create or replace function public.save_entries(p_game uuid, p_category text, p_students uuid[])
returns int language plpgsql set search_path = public as $$
declare sid uuid; n int := 0;
begin
  if p_students is null or array_length(p_students, 1) is null then
    raise exception 'Select at least one student.';
  end if;
  foreach sid in array (select array(select distinct x from unnest(p_students) x)) loop
    insert into public.entries (year, game_id, category, student_id, house_id)
    select g.year, g.id, p_category, s.id, s.house_id
      from public.games g, public.students s where g.id = p_game and s.id = sid;
    if not found then raise exception 'A selected student was not found.'; end if;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.need_gm() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_gm() then raise exception 'Only the admin or game master can do this.'; end if;
end $$;

create or replace function public.check_game_cat(p_game uuid, p_cat text) returns public.games
language plpgsql stable security definer set search_path = public as $$
declare g public.games;
begin
  select * into g from public.games where id = p_game;
  if not found then raise exception 'Select a game.'; end if;
  if not ((p_cat = 'Male' and g.male) or (p_cat = 'Female' and g.female)) then
    raise exception 'This game has no % category.', p_cat;
  end if;
  return g;
end $$;

-- Select the winners of Gold / Silver / Bronze / Wood directly
create or replace function public.set_results(p_game uuid, p_category text, p_order uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare g public.games; i int; h uuid; seen uuid[] := '{}';
begin
  perform public.need_gm();
  g := public.check_game_cat(p_game, p_category);
  for i in 1..4 loop
    h := p_order[i];
    if h is not null then
      if h = any(seen) then raise exception 'A house cannot hold two positions.'; end if;
      seen := seen || h;
      if not exists (select 1 from public.houses where id = h and year = g.year) then
        raise exception 'Unknown house selected.';
      end if;
    end if;
  end loop;
  delete from public.results where game_id = p_game and category = p_category;
  for i in 1..4 loop
    h := p_order[i];
    if h is not null then
      insert into public.results (year, game_id, category, pos, house_id)
      values (g.year, p_game, p_category, i, h);
    end if;
  end loop;
end $$;

-- Draw the knock-out bracket according to the game's format
create or replace function public.gen_fixtures(p_game uuid, p_category text, p_houses uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare g public.games; need int; i int; h uuid; seen uuid[] := '{}';
begin
  perform public.need_gm();
  g := public.check_game_cat(p_game, p_category);
  if g.format = 'final' then
    raise exception 'This game uses the "finals only" format – there is no knock-out bracket. Select the winners directly.';
  end if;
  need := case when g.format = 'quarter' then 8 else 4 end;
  if coalesce(array_length(p_houses, 1), 0) <> need then raise exception 'Choose % different houses.', need; end if;
  for i in 1..need loop
    h := p_houses[i];
    if h is null or h = any(seen) then raise exception 'Choose % different houses.', need; end if;
    seen := seen || h;
    if not exists (select 1 from public.houses where id = h and year = g.year) then
      raise exception 'Unknown house selected.';
    end if;
  end loop;
  delete from public.matches where game_id = p_game and category = p_category;
  delete from public.results where game_id = p_game and category = p_category;
  if g.format = 'quarter' then
    insert into public.matches (year, game_id, category, round, h1, h2) values
      (g.year, p_game, p_category, 'Q1', p_houses[1], p_houses[2]),
      (g.year, p_game, p_category, 'Q2', p_houses[3], p_houses[4]),
      (g.year, p_game, p_category, 'Q3', p_houses[5], p_houses[6]),
      (g.year, p_game, p_category, 'Q4', p_houses[7], p_houses[8]),
      (g.year, p_game, p_category, 'S1', null, null),
      (g.year, p_game, p_category, 'S2', null, null),
      (g.year, p_game, p_category, 'F',  null, null),
      (g.year, p_game, p_category, 'T',  null, null);
  else
    insert into public.matches (year, game_id, category, round, h1, h2) values
      (g.year, p_game, p_category, 'S1', p_houses[1], p_houses[2]),
      (g.year, p_game, p_category, 'S2', p_houses[3], p_houses[4]),
      (g.year, p_game, p_category, 'F',  null, null),
      (g.year, p_game, p_category, 'T',  null, null);
  end if;
end $$;

-- Push winners / losers forward (Q -> S -> F / T), drop stale winners, derive positions 1-4
create or replace function public.refresh_bracket(p_game uuid, p_cat text) returns void
language plpgsql security definer set search_path = public as $$
declare g public.games;
begin
  select * into g from public.games where id = p_game;
  if g.format = 'quarter' then
    update public.matches m set
      h1 = (select winner from public.matches where game_id = p_game and category = p_cat and round = 'Q1'),
      h2 = (select winner from public.matches where game_id = p_game and category = p_cat and round = 'Q2')
    where m.game_id = p_game and m.category = p_cat and m.round = 'S1';
    update public.matches m set
      h1 = (select winner from public.matches where game_id = p_game and category = p_cat and round = 'Q3'),
      h2 = (select winner from public.matches where game_id = p_game and category = p_cat and round = 'Q4')
    where m.game_id = p_game and m.category = p_cat and m.round = 'S2';
  end if;
  -- a winner needs both houses and must be one of them
  update public.matches set winner = null
   where game_id = p_game and category = p_cat and winner is not null
     and not (h1 is not null and h2 is not null and winner in (h1, h2));
  update public.matches m set
    h1 = (select winner from public.matches where game_id = p_game and category = p_cat and round = 'S1'),
    h2 = (select winner from public.matches where game_id = p_game and category = p_cat and round = 'S2')
  where m.game_id = p_game and m.category = p_cat and m.round = 'F';
  update public.matches m set
    h1 = (select case when s.winner is null then null when s.winner = s.h1 then s.h2 else s.h1 end
            from public.matches s where s.game_id = p_game and s.category = p_cat and s.round = 'S1'),
    h2 = (select case when s.winner is null then null when s.winner = s.h1 then s.h2 else s.h1 end
            from public.matches s where s.game_id = p_game and s.category = p_cat and s.round = 'S2')
  where m.game_id = p_game and m.category = p_cat and m.round = 'T';
  update public.matches set winner = null
   where game_id = p_game and category = p_cat and winner is not null
     and not (h1 is not null and h2 is not null and winner in (h1, h2));
  -- positions 1-4 come from the final and the third-place match
  delete from public.results where game_id = p_game and category = p_cat;
  insert into public.results (year, game_id, category, pos, house_id)
  select g.year, p_game, p_cat, v.pos, v.hid from (
    select 1 as pos, f.winner as hid from public.matches f
      where f.game_id = p_game and f.category = p_cat and f.round = 'F'
    union all
    select 2, case when f.winner is null then null when f.winner = f.h1 then f.h2 else f.h1 end
      from public.matches f where f.game_id = p_game and f.category = p_cat and f.round = 'F'
    union all
    select 3, t.winner from public.matches t
      where t.game_id = p_game and t.category = p_cat and t.round = 'T'
    union all
    select 4, case when t.winner is null then null when t.winner = t.h1 then t.h2 else t.h1 end
      from public.matches t where t.game_id = p_game and t.category = p_cat and t.round = 'T'
  ) v where v.hid is not null;
end $$;

-- Record the winner of one match
create or replace function public.set_winner(p_match uuid, p_winner uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m public.matches; g public.games; expected int; have int;
begin
  perform public.need_gm();
  select * into m from public.matches where id = p_match;
  if not found then raise exception 'Match not found.'; end if;
  if m.h1 is null or m.h2 is null then raise exception 'This match is not ready yet.'; end if;
  if p_winner is not null and p_winner <> m.h1 and p_winner <> m.h2 then
    raise exception 'Winner must be one of the two houses.';
  end if;
  select * into g from public.games where id = m.game_id;
  expected := case when g.format = 'quarter' then 8 else 4 end;
  select count(*) into have from public.matches where game_id = m.game_id and category = m.category;
  if have <> expected then raise exception 'The fixtures are incomplete – please reset them.'; end if;
  update public.matches set winner = p_winner where id = p_match;
  perform public.refresh_bracket(m.game_id, m.category);
end $$;

-- Remove all fixtures and results of a game (this also unlocks its format)
create or replace function public.clear_game(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.need_gm();
  if not exists (select 1 from public.games where id = p_game) then raise exception 'Select a game.'; end if;
  delete from public.matches where game_id = p_game;
  delete from public.results where game_id = p_game;
end $$;

-- Signatures (principal & game master). Users manage their own; the admin can manage anyone's.
create or replace function public.save_signature(p_user uuid, p_data text) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := coalesce(p_user, auth.uid()); t public.profiles;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  select * into t from public.profiles where id = uid;
  if not found then raise exception 'User not found.'; end if;
  if uid <> auth.uid() and public.my_role() <> 'admin' then
    raise exception 'Only the administrator can upload a signature for another user.';
  end if;
  if t.role not in ('principal','gamemaster') then
    raise exception 'Signatures can only be added for principal and game master users.';
  end if;
  if p_data is null or p_data not like 'data:image/png;base64,%' then
    raise exception 'The signature must be a PNG image.';
  end if;
  if length(p_data) > 200000 then
    raise exception 'The signature image is too large. Please use a smaller picture.';
  end if;
  insert into public.signatures (user_id, role, name, data, updated)
  values (uid, t.role, t.name, p_data, (extract(epoch from now()) * 1000)::bigint)
  on conflict (user_id) do update
    set data = excluded.data, role = excluded.role, name = excluded.name, updated = excluded.updated;
end $$;

create or replace function public.delete_signature(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := coalesce(p_user, auth.uid());
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  if uid <> auth.uid() and public.my_role() <> 'admin' then
    raise exception 'Only the administrator can remove another user''s signature.';
  end if;
  delete from public.signatures where user_id = uid;
end $$;

-- who may call what
revoke all on function public.save_entries(uuid, text, uuid[])  from public, anon;
revoke all on function public.set_results(uuid, text, uuid[])   from public, anon;
revoke all on function public.gen_fixtures(uuid, text, uuid[])  from public, anon;
revoke all on function public.set_winner(uuid, uuid)            from public, anon;
revoke all on function public.clear_game(uuid)                  from public, anon;
revoke all on function public.save_signature(uuid, text)        from public, anon;
revoke all on function public.delete_signature(uuid)            from public, anon;
revoke all on function public.refresh_bracket(uuid, text)       from public, anon, authenticated;
revoke all on function public.need_gm()                         from public, anon, authenticated;
revoke all on function public.check_game_cat(uuid, text)        from public, anon, authenticated;
grant execute on function public.save_entries(uuid, text, uuid[])  to authenticated;
grant execute on function public.set_results(uuid, text, uuid[])   to authenticated;
grant execute on function public.gen_fixtures(uuid, text, uuid[])  to authenticated;
grant execute on function public.set_winner(uuid, uuid)            to authenticated;
grant execute on function public.clear_game(uuid)                  to authenticated;
grant execute on function public.save_signature(uuid, text)        to authenticated;
grant execute on function public.delete_signature(uuid)            to authenticated;
