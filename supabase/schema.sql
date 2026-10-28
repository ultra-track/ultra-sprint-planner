-- ULTRA Sprint Planner · struttura del database e regole di accesso
-- Incolla tutto in Supabase → SQL Editor → New query → Run. Si può rieseguire senza danni.

-- 1) Profili: un profilo per ogni persona che entra. Ruolo iniziale "pending" (in attesa di approvazione).
create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  email text, name text,
  role text not null default 'pending' check (role in ('pending','athlete','coach','therapist','admin')),
  created_at timestamptz not null default now()
);
-- 2) Dati dell'app: ogni documento è (collezione, id, dati)
create table if not exists public.docs(
  col text not null, id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (col,id)
);
alter table public.docs replica identity full;

-- 3) Funzioni di supporto per le regole
create or replace function public.my_role() returns text language sql stable security definer set search_path=public as
$$ select role from public.profiles where id = auth.uid() $$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public as
$$ select coalesce((select role in ('coach','therapist','admin') from public.profiles where id = auth.uid()), false) $$;
create or replace function public.can_manage() returns boolean language sql stable security definer set search_path=public as
$$ select coalesce((select role in ('coach','admin') from public.profiles where id = auth.uid()), false) $$;

-- 4) Ogni nuovo account crea il suo profilo. L'amministratore (la tua email) entra già come admin.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,name,role) values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    case when lower(new.email) = lower('luca.braghetto@gmail.com') then 'admin' else 'pending' end)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- 5) Regole di accesso (Row Level Security)
alter table public.profiles enable row level security;
alter table public.docs enable row level security;
drop policy if exists p_read on public.profiles;
create policy p_read on public.profiles for select using (id = auth.uid() or public.is_staff());
drop policy if exists p_manage on public.profiles;
create policy p_manage on public.profiles for update using (public.can_manage()) with check (public.can_manage());
drop policy if exists p_delete on public.profiles;
create policy p_delete on public.profiles for delete using (public.my_role() = 'admin');

drop policy if exists d_staff on public.docs;
create policy d_staff on public.docs for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists d_ath_read on public.docs;
create policy d_ath_read on public.docs for select using (public.my_role() = 'athlete' and col <> 'logs');
drop policy if exists d_ath_own_read on public.docs;
create policy d_ath_own_read on public.docs for select using (public.my_role() = 'athlete' and col = 'logs' and id = auth.uid()::text);
drop policy if exists d_ath_own_ins on public.docs;
create policy d_ath_own_ins on public.docs for insert with check (public.my_role() = 'athlete' and col = 'logs' and id = auth.uid()::text);
drop policy if exists d_ath_own_upd on public.docs;
create policy d_ath_own_upd on public.docs for update using (public.my_role() = 'athlete' and col = 'logs' and id = auth.uid()::text)
  with check (public.my_role() = 'athlete' and col = 'logs' and id = auth.uid()::text);

-- 6) Aggiornamento "a pezzi" di un documento (unisce i campi, come nell'app attuale)
create or replace function public.jsonb_deep_merge(a jsonb, b jsonb) returns jsonb language plpgsql immutable as $$
declare k text; r jsonb;
begin
  if jsonb_typeof(a) = 'object' and jsonb_typeof(b) = 'object' then
    r := a;
    for k in select jsonb_object_keys(b) loop
      if r ? k then r := jsonb_set(r, array[k], public.jsonb_deep_merge(r->k, b->k));
      else r := r || jsonb_build_object(k, b->k); end if;
    end loop;
    return r;
  end if;
  return b;
end $$;
create or replace function public.merge_doc(p_col text, p_id text, p_patch jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare r jsonb;
begin
  update public.docs set data = public.jsonb_deep_merge(data, p_patch), updated_at = now(), updated_by = auth.uid()
   where col = p_col and id = p_id returning data into r;
  if r is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  return r;
end $$;

-- 7) Aggiornamenti in tempo reale
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='docs') then
    alter publication supabase_realtime add table public.docs;
  end if;
end $$;

-- 8) Permessi di base (le regole sopra decidono chi vede cosa)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.docs to authenticated;
grant select, update, delete on public.profiles to authenticated;
revoke all on public.docs from anon;
revoke all on public.profiles from anon;
grant execute on function public.merge_doc(text, text, jsonb) to authenticated;
grant execute on function public.jsonb_deep_merge(jsonb, jsonb) to authenticated;
grant execute on function public.my_role(), public.is_staff(), public.can_manage() to authenticated;
