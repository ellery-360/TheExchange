-- =====================================================================
--  THE EXCHANGE — passcode migration
--  Removes email-based write access. After this, NO browser can write
--  to the database. Writes only happen through server actions holding
--  the secret key, and only after the passcode has been checked.
--
--  Run once in Supabase → SQL Editor.
-- =====================================================================

-- ---------------------------------------------------------------------
--  1. Drop the old member-write policies.
-- ---------------------------------------------------------------------
drop policy if exists "members can write weeks"  on weeks;
drop policy if exists "members can write legs"   on legs;
drop policy if exists "members can read members" on members;

-- ---------------------------------------------------------------------
--  2. Everything stays publicly readable. No write policy is created,
--     so with RLS on, every insert/update/delete from a browser is
--     refused. The secret key used by the server bypasses RLS.
-- ---------------------------------------------------------------------
drop policy if exists "anyone can read weeks"   on weeks;
drop policy if exists "anyone can read legs"    on legs;
drop policy if exists "anyone can read members" on members;

create policy "anyone can read weeks"   on weeks   for select using (true);
create policy "anyone can read legs"    on legs    for select using (true);
create policy "anyone can read members" on members for select using (true);

alter table weeks   enable row level security;
alter table legs    enable row level security;
alter table members enable row level security;

-- ---------------------------------------------------------------------
--  3. members is now just a roster: who plays, and their line colour.
--     Emails are no longer used for anything, so drop them.
-- ---------------------------------------------------------------------
alter table members drop column if exists email cascade;
alter table members add column if not exists id bigint generated always as identity;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'members_pkey'
  ) then
    alter table members add primary key (id);
  end if;
end $$;

-- ---------------------------------------------------------------------
--  4. Set your five. display_name must match the punter names already
--     in `legs`, or last season's rows won't line up.
-- ---------------------------------------------------------------------
delete from members;
insert into members (display_name, colour) values
  ('Ellery', '#C9A227'),
  ('Dan',    '#4E8C6A'),
  ('George', '#3A5A8C'),
  ('Rory',   '#9E2B25'),
  ('Alfie',  '#6B4A7A');

-- ---------------------------------------------------------------------
--  5. Check. This should return the roster; an INSERT from a browser
--     using the publishable key should now fail.
-- ---------------------------------------------------------------------
select display_name, colour from members order by display_name;
