-- Run once in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.network_signals (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  node_name text not null check (node_name ~ '^node_[0-9]{3}$'),
  body text not null check (char_length(body) between 1 and 100),
  status text not null default 'active' check (status in ('active', 'hidden')),
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists network_signals_active_created_idx
  on public.network_signals (status, created_at desc);

create table if not exists public.network_signal_reports (
  signal_id uuid not null references public.network_signals(id) on delete cascade,
  visitor_id text not null,
  created_at timestamptz not null default now(),
  primary key (signal_id, visitor_id)
);

alter table public.network_signals enable row level security;
alter table public.network_signal_reports enable row level security;

drop policy if exists "read active network signals" on public.network_signals;
create policy "read active network signals"
  on public.network_signals for select
  to anon
  using (status = 'active' and expires_at > now());

create or replace function public.submit_network_signal(
  p_visitor_id text,
  p_node_name text,
  p_body text
) returns public.network_signals
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.network_signals;
  clean_body text := btrim(p_body);
begin
  if char_length(clean_body) < 1 or char_length(clean_body) > 100 then
    raise exception 'invalid_body';
  end if;
  if clean_body ~* '(https?://|www\.|t\.me/|vk\.com/)' then
    raise exception 'links_not_allowed';
  end if;
  if exists (
    select 1 from public.network_signals
    where visitor_id = p_visitor_id
      and created_at > now() - interval '3 hours'
  ) then
    raise exception 'rate_limit';
  end if;
  insert into public.network_signals(visitor_id, node_name, body)
  values (p_visitor_id, p_node_name, clean_body)
  returning * into result;
  return result;
end;
$$;

create or replace function public.report_network_signal(
  p_signal_id uuid,
  p_visitor_id text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.network_signal_reports(signal_id, visitor_id)
  values (p_signal_id, p_visitor_id);
  update public.network_signals
  set report_count = report_count + 1,
      status = case when report_count + 1 >= 3 then 'hidden' else status end
  where id = p_signal_id;
end;
$$;

grant select on public.network_signals to anon;
revoke all on function public.submit_network_signal(text, text, text) from public;
revoke all on function public.report_network_signal(uuid, text) from public;
grant execute on function public.submit_network_signal(text, text, text) to anon;
grant execute on function public.report_network_signal(uuid, text) to anon;

do $$
begin
  alter publication supabase_realtime add table public.network_signals;
exception
  when duplicate_object then null;
end $$;
