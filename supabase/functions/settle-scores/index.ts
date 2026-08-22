// =====================================================================
//  THE EXCHANGE — settle-scores
//
//  Two phases, both quota-frugal:
//
//   LINK   Legs with no fixture_id are resolved once, by fetching the
//          day's fixtures for the four divisions and name-matching.
//          Costs 4 requests, and only when there is something new.
//
//   POLL   Legs that already have a fixture_id are fetched together by
//          id in ONE request, however many there are. Runs every ten
//          minutes during matches and writes the live score.
//
//  Full time is decided here; the database trigger only commits a
//  WIN or LOSE once the status is final.
//
//  Deploy:  supabase functions deploy settle-scores
//  Secret:  supabase secrets set API_FOOTBALL_KEY=...
// =====================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const API = "https://v3.football.api-sports.io";
const LEAGUES = [39, 40, 41, 42]; // Premier, Championship, League One, League Two
const FINAL = ["FT", "AET", "PEN"];
const DEAD = ["PST", "CANC", "ABD", "AWD", "WO"];

function normalise(name: string): string {
  return String(name)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/\b(fc|afc|cf|association|football|club)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function score(a: string, b: string): number {
  const x = normalise(a), y = normalise(b);
  if (!x || !y) return 0;
  if (x === y) return 100;
  if (x.startsWith(y) || y.startsWith(x)) return 80;
  if (x.includes(y) || y.includes(x)) return 70;
  return 0;
}

const seasonFor = (date: string) => {
  const d = new Date(date);
  return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
};

Deno.serve(async (req) => {
  const key = Deno.env.get("API_FOOTBALL_KEY");
  if (!key) return json({ error: "API_FOOTBALL_KEY is not set" }, 500);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const gwParam = new URL(req.url).searchParams.get("gw");
  const call = async (path: string) => {
    const res = await fetch(`${API}${path}`, { headers: { "x-apisports-key": key } });
    if (!res.ok) return null;
    const body = await res.json();
    return Array.isArray(body?.response) ? body.response : null;
  };

  let q = db
    .from("legs")
    .select("id, gw, punter, team, opponent, fixture_id, status, result, weeks!inner(match_date)")
    .or(`status.is.null,status.not.in.(${[...FINAL, ...DEAD].join(",")})`);
  if (gwParam) q = q.eq("gw", Number(gwParam));

  const { data: legs, error } = await q;
  if (error) return json({ error: error.message }, 500);

  /* Nothing in play and nothing unresolved: spend no quota at all.
   * This is what makes a ten-minute schedule affordable. */
  if (!legs?.length) return json({ ok: true, apiCalls: 0, message: "Nothing in play." });

  let calls = 0;
  const linked: any[] = [];
  const unmatched: any[] = [];
  const updated: any[] = [];

  // ---------------------------------------------------------------- LINK
  const needLink = legs.filter((l: any) => !l.fixture_id);

  if (needLink.length) {
    const { data: aliasRows } = await db.from("team_aliases").select("alias, api_name");
    const aliases = new Map<string, string>(
      (aliasRows || []).map((r: any) => [normalise(r.alias), r.api_name]),
    );

    const dates = [...new Set(needLink.map((l: any) => l.weeks.match_date))];
    const byDate: Record<string, any[]> = {};

    for (const date of dates) {
      byDate[date] = [];
      for (const league of LEAGUES) {
        const rows = await call(`/fixtures?date=${date}&league=${league}&season=${seasonFor(date)}`);
        calls++;
        if (rows) byDate[date].push(...rows);
      }
    }

    for (const leg of needLink as any[]) {
      const wanted = aliases.get(normalise(leg.team)) || leg.team;
      const other = aliases.get(normalise(leg.opponent)) || leg.opponent;

      let best: any = null, bestScore = 0;
      for (const f of byDate[leg.weeks.match_date] || []) {
        const home = f.teams?.home?.name || "", away = f.teams?.away?.name || "";
        const asHome = score(wanted, home) + score(other, away);
        const asAway = score(wanted, away) + score(other, home);
        const s = Math.max(asHome, asAway);
        if (s > bestScore) { bestScore = s; best = { f, isHome: asHome >= asAway }; }
      }

      /* Both teams must match. One strong match is not enough — too
       * easy to confuse the Manchester sides, or Boro with Brom. */
      if (!best || bestScore < 140) {
        unmatched.push({ gw: leg.gw, punter: leg.punter, team: leg.team, reason: "no fixture matched" });
        continue;
      }

      await db.from("legs").update({
        fixture_id: best.f.fixture.id,
        venue: best.isHome ? "H" : "A",
      }).eq("id", leg.id);

      leg.fixture_id = best.f.fixture.id;
      linked.push({
        gw: leg.gw, punter: leg.punter,
        fixture: `${best.f.teams.home.name} v ${best.f.teams.away.name}`,
      });
    }
  }

  // ---------------------------------------------------------------- POLL
  const live = legs.filter((l: any) => l.fixture_id);
  if (live.length) {
    const ids = [...new Set(live.map((l: any) => l.fixture_id))];

    /* One request for every fixture, however many. The endpoint takes
     * up to 20 ids joined with dashes. */
    for (let i = 0; i < ids.length; i += 20) {
      const rows = await call(`/fixtures?ids=${ids.slice(i, i + 20).join("-")}`);
      calls++;
      if (!rows) continue;

      for (const f of rows) {
        const status = f.fixture?.status?.short;
        const minute = f.fixture?.status?.elapsed ?? null;
        const h = f.goals?.home, a = f.goals?.away;

        for (const leg of live.filter((l: any) => l.fixture_id === f.fixture.id)) {
          const isHome = score(leg.team, f.teams.home.name) >= score(leg.team, f.teams.away.name);
          const payload: Record<string, unknown> = { status, minute };

          if (DEAD.includes(status)) {
            payload.gf = null; payload.ga = null; payload.result = "VOID";
          } else if (h !== null && h !== undefined && a !== null && a !== undefined) {
            payload.gf = isHome ? h : a;
            payload.ga = isHome ? a : h;
            payload.result = null;  // trigger decides, and only at full time
          }

          const { error: upErr } = await db.from("legs").update(payload).eq("id", leg.id);
          if (upErr) {
            unmatched.push({ gw: leg.gw, punter: leg.punter, reason: upErr.message });
          } else {
            updated.push({
              gw: leg.gw, punter: leg.punter, team: leg.team,
              score: payload.gf === null ? "void" : `${payload.gf}-${payload.ga}`,
              status, minute,
            });
          }
        }
      }
    }
  }

  return json({
    ok: true,
    apiCalls: calls,
    linked: linked.length,
    updated: updated.length,
    stillPending: unmatched.length,
    inPlay: updated.filter((u) => !FINAL.includes(u.status) && u.status !== "NS").length,
    details: { linked, updated, unmatched },
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status, headers: { "Content-Type": "application/json" },
  });
}
