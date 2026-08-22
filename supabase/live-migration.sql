-- =====================================================================
--  THE EXCHANGE — live in-play settlement
--
--  Adds fixture tracking so scores can be polled during matches, and
--  stops the trigger from settling a leg before full time.
--
--  Run after leg-types-migration.sql.
-- =====================================================================

alter table legs add column if not exists fixture_id bigint;
alter table legs add column if not exists status     text;
alter table legs add column if not exists minute     int;

comment on column legs.fixture_id is 'API-Football fixture id, resolved once when picks are entered.';
comment on column legs.status is 'API-Football short status: NS, 1H, HT, 2H, ET, FT, PST, CANC, ABD.';

create index if not exists legs_pending_idx on legs (gw) where fixture_id is null;

-- ---------------------------------------------------------------------
--  Settle only at full time.
--
--  Mid-match the score is written but `result` stays null, so a leg
--  that is 1-0 down at half time is not recorded as lost. The app
--  computes a provisional price from the live score instead, and only
--  the final result is ever committed here.
-- ---------------------------------------------------------------------
create or replace function settle_leg() returns trigger as $$
declare
  won_match boolean;
  btts      boolean;
  over15    boolean;
  extra_ok  boolean;
  final     boolean;
begin
  new.updated_at := now();

  -- abandoned, postponed or cancelled: void it, the bookmaker will too
  if new.status in ('PST','CANC','ABD','AWD','WO') then
    new.result := 'VOID';
    return new;
  end if;

  if new.result = 'VOID' then
    return new;
  end if;

  if new.gf is null or new.ga is null then
    return new;
  end if;

  -- null status means it was typed in by hand, so treat it as final
  final := new.status is null or new.status in ('FT','AET','PEN');

  if not final then
    new.result := null;                     -- in play: no verdict yet
    return new;
  end if;

  won_match := new.gf > new.ga;
  btts      := new.gf > 0 and new.ga > 0;
  over15    := (new.gf + new.ga) >= 2;

  extra_ok := (position('BTTS' in new.extra) = 0 or btts)
          and (position('O1.5' in new.extra) = 0 or over15);

  new.result := case
    when (not new.needs_win or won_match) and extra_ok then 'WIN'
    else 'LOSE'
  end;
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
--  Expose status and minute to the front end.
-- ---------------------------------------------------------------------
drop view if exists ledger;

create view ledger as
select
  l.gw,
  w.match_date  as date,
  w.stake,
  l.punter,
  l.team,
  l.venue,
  l.opponent,
  l.extra,
  l.needs_win,
  l.odds,
  l.gf,
  l.ga,
  l.result,
  l.status,
  l.minute,
  (l.gf - l.ga) as margin,
  case
    when l.gf is null or l.ga is null then null
    else greatest(
      case when l.needs_win and l.gf <= l.ga then l.ga - l.gf + 1 else 0 end,
      case when position('BTTS' in l.extra) > 0
                and not (l.gf > 0 and l.ga > 0)
           then (case when l.gf = 0 then 1 else 0 end)
              + (case when l.ga = 0 then 1 else 0 end)
           else 0 end,
      case when position('O1.5' in l.extra) > 0 and (l.gf + l.ga) < 2
           then 2 - (l.gf + l.ga) else 0 end
    )
  end           as short
from legs l
join weeks w using (gw)
order by l.gw, l.punter;

-- ---------------------------------------------------------------------
--  Poll every 10 minutes on Saturdays, 12:00 to 22:00 UK.
--  The function returns immediately without touching the API when
--  nothing is in play, so most of these runs cost nothing.
--
--  REPLACE YOUR-PROJECT and YOUR-ANON-KEY before running.
-- ---------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobname) from cron.job
 where jobname in ('settle-scores-early','settle-scores-late','settle-live');

select cron.schedule(
  'settle-live',
  '*/10 11-21 * * 6',    -- every 10 min, 11:00-21:59 UTC, Saturdays
  $$
  select net.http_post(
    url     := 'https://YOUR-PROJECT.supabase.co/functions/v1/settle-scores',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer YOUR-ANON-KEY"}'::jsonb
  );
  $$
);

select jobname, schedule, active from cron.job;
