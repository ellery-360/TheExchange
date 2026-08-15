# The Exchange

Royal Bourse of the Footballing Realm. A weekly five-fold acca tracker where each
punter is traded as a stock, priced on the odds they take and whether their leg lands.

Next.js 14 (App Router) · Supabase (Postgres, Auth, Realtime) · Vercel.

---

## Deploy

About twenty minutes, most of it waiting.

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com). Pick the London region.
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
3. Open the `members` table and replace the five seed rows with the real emails and
   names. **The `display_name` values are what appear on the bourse** — first names
   only, since the site is public.
4. **Project Settings → API**: copy the Project URL and the `anon` public key.

### 2. Vercel

1. Push this folder to a GitHub repo.
2. [vercel.com/new](https://vercel.com/new) → import the repo → **Deploy**.
   Vercel auto-detects Next.js; no build settings to change. The first deploy
   succeeds even without env vars — the site just shows "Not connected".
3. **Settings → Environment Variables**, add all three:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your `anon` key |
   | `NEXT_PUBLIC_SITE_URL` | your Vercel URL, no trailing slash |

4. **Deployments → Redeploy.**

### 3. Point auth back at the site

In Supabase, **Authentication → URL Configuration**:

- **Site URL**: your Vercel URL
- **Redirect URLs**: add `https://your-app.vercel.app/auth/confirm`

Miss this and the magic links will bounce you to localhost.

### 4. First week

Go to `/login`, enter an email that's in `members`, click the emailed link, and you
land on the entry desk.

---

## Weekly routine

**Saturday, before kickoff.** `/enter` → *Saturday picks*. Five teams, home or away,
optional BTTS or Over 1.5, and the price Bet365 showed for the leg **as built**. If
you added BTTS, that's the Bet Builder price, not the win price. Lock it in.

**Saturday evening.** *Settle scores*. Goals for and against your selected team.
Nothing else — a Postgres trigger works out whether the leg won, including whether
BTTS and Over 1.5 actually hit. You never set WIN or LOSE by hand, which kills the
"won 1-0 with BTTS on" error permanently. `P–P` marks a postponement as void.

Prices move the instant you save, on every open browser.

---

## How the market moves

Everyone opens at ƒ100.

| Event | Effect |
|---|---|
| Leg lands | `+(odds − 1) × 6%`, capped at +40% |
| Leg loses | `−(1 / odds) × 20%` |
| Acca lands | `+8%` dividend to everyone |
| In the stocks | `−12% × (innocents / 4)` |

Winning pays out on ambition; a 4.00 shout earns six times what a 1.50 banker does.
Losing charges you for arrogance; a blown 1.20 certainty costs five times a blown
6.00 punt. Every losing leg goes in the stocks and collects one tomato from each
punter still standing, so being wrong alone is far worse than being wrong in company.
Only a solo failure is charged the forgone winnings, since two losing legs means
neither one alone cost you the acca.

---

## Structure

```
app/
  page.jsx              the bourse (public, server-rendered)
  login/page.jsx        magic link
  enter/page.jsx        entry desk (members only)
  auth/confirm/route.js magic link callback
components/
  Exchange.jsx          the whole read-only UI
  EntryDesk.jsx         picks and scores
  Pillory.jsx           the stocks, drawn in SVG
lib/
  engine.js             all scoring logic. Pure, no React, no Supabase.
  supabase/             browser and server clients
supabase/schema.sql     tables, trigger, RLS, realtime
```

`lib/engine.js` is deliberately dependency-free — `buildMarket(rows)` takes plain
objects and returns the whole market. Tweak the constants at the top to retune the
economy mid-season if the prices feel wrong.

---

## Notes

- **The bourse is public; writing is not.** Anyone with the link reads it. Only
  emails in `members` can change anything, enforced by row-level security in
  Postgres rather than in the app.
- **Odds are typed by hand on purpose.** Bet365 has no public API, and you need the
  price you took, not the current price.
- **Auto-fetching scores** would go in a Supabase Edge Function on a Saturday-evening
  cron. Free football APIs mostly stop at the Championship, so League One and Two
  need a paid tier or API-Football's free allowance.
