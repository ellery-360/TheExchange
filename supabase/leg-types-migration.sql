-- =====================================================================
--  THE EXCHANGE — leg types
--
--  Until now every leg assumed the named team had to win. Some legs
--  are goals markets only (Both Teams to Score, Over 1.5) with no
--  result component. This adds `needs_win` to distinguish them.
--
--  Run once in Supabase → SQL Editor, after passcode-migration.sql.
-- =====================================================================

alter table legs
  add column if not exists needs_win boolean not null default true;

comment on column legs.needs_win is
  'True when the named team must win. False for goals-only legs (BTTS or
   Over 1.5 with no result component) — team/opponent then just identify
   the fixture, and gf/ga are still goals for and against `team`.';

-- ---------------------------------------------------------------------
--  Settle: a leg lands if (it did not need a win, or the team won)
--  AND every goals condition attached to it landed.
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
--  Ledger view: `short` is the fewest goals that would have rescued
--  the leg. One goal can satisfy several conditions at once, so take
--  the largest single shortfall rather than the sum.
-- ---------------------------------------------------------------------
--  Postgres cannot reorder or rename columns in an existing view, so
--  drop it first. A view stores no data — only the query.
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
--  Re-settle every existing leg under the new rule.
-- ---------------------------------------------------------------------
update legs set updated_at = now() where gf is not null and ga is not null;

select punter, team, extra, needs_win, gf, ga, result, short
from ledger order by gw, punter;
