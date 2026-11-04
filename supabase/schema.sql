-- Ernest Edge · esquema de base de datos para Supabase
-- Pégalo completo en Supabase → SQL Editor → New query → Run.

-- 1) Trades, backtests y ajustes de cada usuario
create table if not exists public.items (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  id         text        not null,
  kind       text        not null check (kind in ('t', 'b', 'settings')),
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.items enable row level security;

drop policy if exists "items: ver los propios" on public.items;
drop policy if exists "items: crear los propios" on public.items;
drop policy if exists "items: editar los propios" on public.items;
drop policy if exists "items: borrar los propios" on public.items;
create policy "items: ver los propios"    on public.items for select using (auth.uid() = user_id);
create policy "items: crear los propios"  on public.items for insert with check (auth.uid() = user_id);
create policy "items: editar los propios" on public.items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "items: borrar los propios" on public.items for delete using (auth.uid() = user_id);

-- 2) Registro de uso de la IA (para el límite diario por usuario)
create table if not exists public.ai_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_day on public.ai_usage (user_id, created_at);
alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage: ver los propios" on public.ai_usage;
drop policy if exists "ai_usage: crear los propios" on public.ai_usage;
create policy "ai_usage: ver los propios"   on public.ai_usage for select using (auth.uid() = user_id);
create policy "ai_usage: crear los propios" on public.ai_usage for insert with check (auth.uid() = user_id);

-- 3) Permisos: solo usuarios con sesión iniciada; nadie anónimo puede leer nada
grant select, insert, update, delete on public.items to authenticated;
grant select, insert on public.ai_usage to authenticated;
revoke all on public.items, public.ai_usage from anon;

-- 4) Planes del día (kind 'p') y copia del calendario (kind 'e') en la tabla de cada usuario
alter table public.items drop constraint if exists items_kind_check;
alter table public.items add constraint items_kind_check check (kind in ('t', 'b', 'p', 'e', 'settings'));

-- 5) Calendario económico compartido (lo llena el servidor; todos pueden leerlo)
create table if not exists public.econ_events (
  id         text primary key,
  ts         timestamptz not null,
  cur        text        not null,
  title      text        not null,
  impact     smallint    not null default 1,
  actual     text        not null default '',
  forecast   text        not null default '',
  previous   text        not null default '',
  fetched_at timestamptz not null default now()
);
create index if not exists econ_events_ts on public.econ_events (ts);
alter table public.econ_events enable row level security;
drop policy if exists "econ: lectura pública" on public.econ_events;
create policy "econ: lectura pública" on public.econ_events for select using (true);
grant select on public.econ_events to anon, authenticated;
