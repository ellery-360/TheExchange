-- =====================================================================
--  THE EXCHANGE — Supabase schema
--  Paste into the SQL editor. Safe to run once, top to bottom.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Who is allowed to write. Insert your five emails here.
-- ---------------------------------------------------------------------
create table members (
  email        text primary key,
  display_name text not null,
  colour       text,                       -- hex for their line on the chart
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  One row per gameweek. Stake lives here, not on the leg.
-- ---------------------------------------------------------------------
create table weeks (
  gw          int primary key,
  match_date  date not null,
  stake       numeric(8,2) not null default 25 check (stake > 0),
  placed_at   timestamptz,                 -- when the bet actually went on
  bookmaker   text default 'Bet365',
  notes       text
);

-- ---------------------------------------------------------------------
--  One row per punter per gameweek.
--  gf / ga are goals for and against the SELECTED team.
-- ---------------------------------------------------------------------
create table legs (
  id         uuid primary key default gen_random_uuid(),
  gw         int  not null references weeks(gw) on delete cascade,
  punter     text not null,
  team       text not null,
  venue      char(1) not null default 'H' check (venue in ('H','A')),
  opponent   text,
  extra      text not null default 'NONE'
             check (extra in ('NONE','BTTS','O1.5','BTTS+O1.5')),
  odds       numeric(6,2) not null check (odds > 1.00),
  gf         int check (gf >= 0),
  ga         int check (ga >= 0),
  result     text check (result in ('WIN','LOSE','VOID')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- one leg each per week, no duplicates
  unique (gw, punter)
);

create index legs_gw_idx on legs (gw);

-- ---------------------------------------------------------------------
--  Derive the result from the score so bookkeeping can't drift.
--  Leaves `result` alone when the score hasn't been entered yet,
--  and never overrides a manual VOID.
-- ---------------------------------------------------------------------
create or replace function settle_leg() returns trigger as $$
declare
  won_match boolean;
  btts      boolean;
  over15    boolean;
  extra_ok  boolean;
begin
  new.updated_at := now();

  if new.result = 'VOID' then
    return new;
  end if;

  if new.gf is null or new.ga is null then
    return new;                            -- not played, or score not in yet
  end if;

  won_match := new.gf > new.ga;
  btts      := new.gf > 0 and new.ga > 0;
  over15    := (new.gf + new.ga) >= 2;

  extra_ok := (position('BTTS' in new.extra) = 0 or btts)
          and (position('O1.5' in new.extra) = 0 or over15);

  new.result := case when won_match and extra_ok then 'WIN' else 'LOSE' end;
  return new;
end;
$$ language plpgsql;

create trigger legs_settle
  before insert or update on legs
  for each row execute function settle_leg();

-- ---------------------------------------------------------------------
--  Convenience view: everything the front end needs in one select.
--  `short` is how many goals would have rescued a losing leg.
-- ---------------------------------------------------------------------
create or replace view ledger as
select
  l.gw,
  w.match_date            as date,
  w.stake,
  l.punter,
  l.team,
  l.venue,
  l.opponent,
  l.extra,
  l.odds,
  l.gf,
  l.ga,
  l.result,
  (l.gf - l.ga)           as margin,
  case
    when l.gf is null or l.ga is null then null
    when l.gf <= l.ga then l.ga - l.gf + 1
    when position('BTTS' in l.extra) > 0 and not (l.gf > 0 and l.ga > 0) then 1
    when position('O1.5' in l.extra) > 0 and (l.gf + l.ga) < 2 then 2 - (l.gf + l.ga)
    else 0
  end                     as short
from legs l
join weeks w using (gw)
order by l.gw, l.punter;

-- =====================================================================
--  ROW LEVEL SECURITY
--  Anyone with the link can read. Only the five can write.
-- =====================================================================
alter table members enable row level security;
alter table weeks   enable row level security;
alter table legs    enable row level security;

create policy "anyone can read weeks" on weeks
  for select using (true);

create policy "anyone can read legs" on legs
  for select using (true);

create policy "members can read members" on members
  for select to authenticated using (true);

create policy "members can write weeks" on weeks
  for all to authenticated
  using      (exists (select 1 from members m where m.email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from members m where m.email = auth.jwt() ->> 'email'));

create policy "members can write legs" on legs
  for all to authenticated
  using      (exists (select 1 from members m where m.email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from members m where m.email = auth.jwt() ->> 'email'));

-- =====================================================================
--  SEED — replace with the real five
-- =====================================================================
insert into members (email, display_name, colour) values
  ('you@example.com',    'Danny',  '#C9A227'),
  ('two@example.com',    'Marcus', '#4E8C6A'),
  ('three@example.com',  'Callum', '#3A5A8C'),
  ('four@example.com',   'Tom',    '#9E2B25'),
  ('five@example.com',   'Ash',    '#6B4A7A');

-- =====================================================================
--  REALTIME
--  Lets every open browser update the moment a score is entered.
-- =====================================================================
alter publication supabase_realtime add table legs;
alter publication supabase_realtime add table weeks;
