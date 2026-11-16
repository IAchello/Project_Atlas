-- Project Atlas — online shared projects on Supabase.
-- Run once: Supabase dashboard > SQL Editor > New query > paste this file > Run.
-- It can be run again safely (existing projects are kept).
--
-- Access model: no accounts. A shared project is reached by its identifier (in the share link):
-- whoever has the link can read it, and whoever also has the edit code can save it.
-- The table itself is closed (row level security, no policy); the app only goes through the
-- functions below, so projects cannot be listed or searched by anyone.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.atlas_projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  data        jsonb not null,
  version     integer not null default 1,
  edit_hash   text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text not null default ''
);
alter table public.atlas_projects enable row level security;
revoke all on public.atlas_projects from anon, authenticated;

-- create a shared project; returns its id
create or replace function public.atlas_create(p_name text, p_data jsonb, p_edit_code text, p_by text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r public.atlas_projects;
begin
  if p_edit_code is null or length(p_edit_code) < 6 then raise exception 'edit code too short'; end if;
  if pg_column_size(p_data) > 8000000 then raise exception 'project too large'; end if;
  insert into public.atlas_projects (name, data, edit_hash, updated_by)
  values (left(coalesce(p_name, ''), 200), p_data, crypt(p_edit_code, gen_salt('bf')), left(coalesce(p_by, ''), 80))
  returning * into r;
  return json_build_object('id', r.id, 'version', r.version, 'updated_at', r.updated_at);
end $$;

-- read a shared project (null when the id is unknown)
create or replace function public.atlas_get(p_id uuid)
returns json language sql security definer stable set search_path = public as $$
  select json_build_object('id', id, 'name', name, 'data', data, 'version', version, 'updated_at', updated_at, 'updated_by', updated_by)
  from public.atlas_projects where id = p_id;
$$;

-- version only: used to notice that somebody else saved
create or replace function public.atlas_head(p_id uuid)
returns json language sql security definer stable set search_path = public as $$
  select json_build_object('version', version, 'updated_at', updated_at, 'updated_by', updated_by, 'name', name)
  from public.atlas_projects where id = p_id;
$$;

-- is this the edit code of the project?
create or replace function public.atlas_check(p_id uuid, p_edit_code text)
returns boolean language sql security definer stable set search_path = public, extensions as $$
  select coalesce((select edit_hash = crypt(p_edit_code, edit_hash) from public.atlas_projects where id = p_id), false);
$$;

-- save: refused without the edit code, and refused (reason "conflict") when somebody else saved
-- since p_expected, unless p_force is true
create or replace function public.atlas_save(p_id uuid, p_edit_code text, p_data jsonb, p_name text, p_expected integer, p_by text, p_force boolean default false)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r public.atlas_projects;
begin
  select * into r from public.atlas_projects where id = p_id for update;
  if not found then return json_build_object('ok', false, 'reason', 'missing'); end if;
  if r.edit_hash <> crypt(coalesce(p_edit_code, ''), r.edit_hash) then return json_build_object('ok', false, 'reason', 'code'); end if;
  if pg_column_size(p_data) > 8000000 then return json_build_object('ok', false, 'reason', 'size'); end if;
  if r.version <> p_expected and not coalesce(p_force, false) then
    return json_build_object('ok', false, 'reason', 'conflict', 'version', r.version, 'updated_at', r.updated_at, 'updated_by', r.updated_by);
  end if;
  update public.atlas_projects
     set data = p_data, name = left(coalesce(p_name, ''), 200), version = r.version + 1, updated_at = now(), updated_by = left(coalesce(p_by, ''), 80)
   where id = p_id returning * into r;
  return json_build_object('ok', true, 'version', r.version, 'updated_at', r.updated_at);
end $$;

-- remove a shared project (edit code required)
create or replace function public.atlas_delete(p_id uuid, p_edit_code text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  delete from public.atlas_projects where id = p_id and edit_hash = crypt(coalesce(p_edit_code, ''), edit_hash);
  return found;
end $$;

revoke all on function public.atlas_create(text, jsonb, text, text) from public;
revoke all on function public.atlas_get(uuid) from public;
revoke all on function public.atlas_head(uuid) from public;
revoke all on function public.atlas_check(uuid, text) from public;
revoke all on function public.atlas_save(uuid, text, jsonb, text, integer, text, boolean) from public;
revoke all on function public.atlas_delete(uuid, text) from public;
grant execute on function public.atlas_create(text, jsonb, text, text) to anon, authenticated;
grant execute on function public.atlas_get(uuid) to anon, authenticated;
grant execute on function public.atlas_head(uuid) to anon, authenticated;
grant execute on function public.atlas_check(uuid, text) to anon, authenticated;
grant execute on function public.atlas_save(uuid, text, jsonb, text, integer, text, boolean) to anon, authenticated;
grant execute on function public.atlas_delete(uuid, text) to anon, authenticated;
