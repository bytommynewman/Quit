-- Quit — database schema for a fresh Supabase project.
-- Paste the whole file into the SQL Editor (Dashboard → SQL Editor → New
-- query → Run). Safe to re-run: every statement is idempotent.
--
-- One user, several devices. Every table carries user_id (defaulted to the
-- signed-in user) and row-level security so a session can only ever see its
-- own rows. updated_at is maintained by a trigger, not by the app.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --------------------------------------------------------------------------

create table if not exists public.quit_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  method text not null default 'cold_turkey' check (method in ('cold_turkey', 'taper')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  baseline_use text,
  baseline_cost_cents_per_week integer not null default 0 check (baseline_cost_cents_per_week >= 0),
  reasons text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists quit_attempts_one_active_idx
  on public.quit_attempts (user_id) where status = 'active';

create table if not exists public.slips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  attempt_id uuid not null references public.quit_attempts (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  trigger text,
  trigger_tags text[] not null default '{}',
  severity smallint check (severity between 1 and 5),
  support_used boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists slips_attempt_idx on public.slips (attempt_id, occurred_at desc);

create table if not exists public.withdrawal_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  attempt_id uuid not null references public.quit_attempts (id) on delete cascade,
  checkin_date date not null,
  sleep_hours numeric(3,1) check (sleep_hours between 0 and 24),
  sleep_quality smallint check (sleep_quality between 0 and 10),
  appetite smallint check (appetite between 0 and 10),
  mood smallint check (mood between 0 and 10),
  anxiety smallint check (anxiety between 0 and 10),
  irritability smallint check (irritability between 0 and 10),
  energy smallint check (energy between 0 and 10),
  craving_peak smallint check (craving_peak between 0 and 10),
  vivid_dreams boolean not null default false,
  night_sweats boolean not null default false,
  headache boolean not null default false,
  nausea boolean not null default false,
  meals_count smallint check (meals_count between 0 and 10),
  ate_breakfast boolean not null default false,
  worked_out boolean not null default false,
  got_outside boolean not null default false,
  used_cannabis boolean not null default false,
  nicotine_level smallint check (nicotine_level between 0 and 3),
  drinks_count smallint check (drinks_count between 0 and 30),
  cws_items jsonb,
  cws_total smallint check (cws_total between 0 and 190),
  cws_interference smallint check (cws_interference between 0 and 10),
  win text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, checkin_date)
);

create table if not exists public.coping_tools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('move', 'body', 'mind', 'social', 'swap', 'build')),
  instructions text not null default '',
  minutes smallint not null default 10 check (minutes between 1 and 240),
  setting text not null default 'anywhere' check (setting in ('anywhere', 'home', 'out')),
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  times_used integer not null default 0,
  helpful_votes integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cravings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  attempt_id uuid not null references public.quit_attempts (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  intensity smallint not null check (intensity between 0 and 10),
  hungry boolean not null default false,
  angry boolean not null default false,
  lonely boolean not null default false,
  tired boolean not null default false,
  trigger_tags text[] not null default '{}',
  context text,
  coping_action text,
  coping_tool_id uuid references public.coping_tools (id) on delete set null,
  duration_minutes smallint check (duration_minutes between 0 and 600),
  outcome text check (outcome in ('passed', 'used', 'partial')),
  intensity_after smallint check (intensity_after between 0 and 10),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cravings_attempt_idx on public.cravings (attempt_id, occurred_at desc);

create table if not exists public.if_then_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  attempt_id uuid references public.quit_attempts (id) on delete cascade,
  situation text not null,
  response text not null,
  category text not null default 'general'
    check (category in ('general', 'night_out', 'home', 'sleep', 'food', 'social', 'mood', 'nicotine', 'alcohol', 'ex')),
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  times_triggered integer not null default 0,
  times_held integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quit_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  attempt_id uuid not null references public.quit_attempts (id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 3650),
  title text not null,
  what_to_expect text,
  reward text,
  reached_at timestamptz,
  reward_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, day_number)
);

create table if not exists public.support_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  role text not null check (role in ('parent', 'family', 'therapist', 'doctor', 'friend', 'crisis_line', 'other')),
  phone text,
  text_ok boolean not null default true,
  late_night_ok boolean not null default false,
  knows text not null default 'none' check (knows in ('full', 'partial', 'none')),
  notes text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-user key/value settings (reminder prefs etc.), synced across devices.
create table if not exists public.settings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  value text,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- RLS ----------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['quit_attempts','slips','withdrawal_checkins','coping_tools','cravings','if_then_plans','quit_milestones','support_contacts','settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows select" on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);
    execute format('create policy "own rows select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format('create policy "own rows insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "own rows update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "own rows delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- updated_at triggers ---------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['quit_attempts','withdrawal_checkins','coping_tools','cravings','if_then_plans','quit_milestones','support_contacts','settings']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;
