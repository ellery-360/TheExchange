/* =====================================================================
 *  THE EXCHANGE — market engine
 *  Pure functions. No React, no Supabase. Feed it rows, get a market.
 * ===================================================================== */

export const START_PRICE = 100;
export const WIN_MULT = 6;    // gain % = (odds - 1) x 6
export const WIN_CAP = 40;    // max weekly gain from one leg
export const LOSS_MULT = 20;  // drop % = implied probability x 20
export const DIVIDEND = 8;    // paid to all when the acca lands
export const PILLORY = 12;    // full penalty for breaking it alone
export const FLOOR = 5;       // a merchant cannot be worth less

/* Pigments of the realm — every colour a real medieval one */
export const PIGMENTS = ["#C9A227", "#4E8C6A", "#3A5A8C", "#9E2B25", "#6B4A7A"];

export function num(v) {
  if (v === "" || v === undefined || v === null) return null;
  const n = parseInt(String(v).trim(), 10);
  return Number.isNaN(n) ? null : n;
}

export function roman(n) {
  const map = [[50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  let v = n;
  for (const [val, sym] of map) while (v >= val) { out += sym; v -= val; }
  return out || "0";
}

export const f = (n) => Number(n).toFixed(1);
export const pctStr = (n) => (n > 0 ? "+" : "") + Number(n).toFixed(1) + "%";

export function list(names) {
  if (names.length <= 1) return names[0] || "";
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}

/* How close was it? Null when the score wasn't recorded. */
export function detail(l) {
  if (l.gf === null || l.ga === null || l.gf === undefined || l.ga === undefined) return null;
  const margin = l.gf - l.ga;
  const total = l.gf + l.ga;
  const btts = l.gf > 0 && l.ga > 0;
  const over15 = total >= 2;
  const wantsBtts = String(l.extra).includes("BTTS");
  const wantsOver = String(l.extra).includes("O1.5");
  const extraOk = (!wantsBtts || btts) && (!wantsOver || over15);
  const wonMatch = margin > 0;

  let short = 0;
  if (!wonMatch) {
    short = l.ga - l.gf + 1;
  } else if (!extraOk) {
    if (wantsBtts && !btts) short = Math.max(short, 1);
    if (wantsOver && !over15) short = Math.max(short, 2 - total);
  }
  return {
    margin, total, btts, over15, wonMatch, extraOk, short,
    derived: wonMatch && extraOk ? "WIN" : "LOSE",
    score: `${l.gf}–${l.ga}`,
  };
}

/* ---------------------------------------------------------------------
 *  buildMarket
 *  rows: [{ gw, date, punter, team, venue, opponent, extra, odds,
 *           gf, ga, result, stake }]
 *  Accepts strings or numbers — the CSV import and the Supabase view
 *  both land here unchanged.
 * ------------------------------------------------------------------- */
export function buildMarket(rows) {
  const clean = (rows || [])
    .filter((r) => r && r.punter && r.gw !== undefined && r.gw !== null && r.gw !== "")
    .map((r) => ({
      gw: parseInt(r.gw, 10),
      date: (r.date || "").toString().trim(),
      punter: (r.punter || "").toString().trim(),
      team: (r.team || "").toString().trim(),
      opponent: (r.opponent || "").toString().trim(),
      venue: (r.venue || "").toString().trim().toUpperCase().charAt(0) === "A" ? "A" : "H",
      extra: (r.extra || "NONE").toString().trim().toUpperCase(),
      odds: parseFloat(r.odds) || 1,
      gf: num(r.gf),
      ga: num(r.ga),
      result: (r.result || "").toString().trim().toUpperCase(),
      stake: parseFloat(r.stake) || 25,
    }))
    .filter((r) => !Number.isNaN(r.gw))
    .map((r) => ({ ...r, d: detail(r) }));

  const punters = [...new Set(clean.map((r) => r.punter))];
  const gws = [...new Set(clean.map((r) => r.gw))].sort((a, b) => a - b);

  const price = {}, tomatoes = {}, stocksCount = {}, cost = {};
  const streak = {}, bestStreak = {}, weekly = {};
  punters.forEach((p) => {
    price[p] = START_PRICE; tomatoes[p] = 0; stocksCount[p] = 0; cost[p] = 0;
    streak[p] = 0; bestStreak[p] = 0; weekly[p] = [];
  });

  const history = [{
    gw: 0, label: "Open",
    ...Object.fromEntries(punters.map((p) => [p, START_PRICE])),
  }];
  const weeks = [];

  gws.forEach((gw) => {
    const legs = clean.filter((r) => r.gw === gw);
    const live = legs.filter((l) => l.result !== "VOID");
    const losers = live.filter((l) => l.result === "LOSE");
    const accaWon = live.length > 0 && losers.length === 0;
    const sole = losers.length === 1 ? losers[0].punter : null;
    const stake = legs[0]?.stake ?? 25;
    const combined = live.reduce((a, l) => a * l.odds, 1);
    const returned = accaWon ? stake * combined : 0;
    const wouldHave = stake * combined;
    if (sole) cost[sole] += wouldHave;

    const scored = losers.filter((l) => l.d);
    const goalsShort = losers.length && scored.length === losers.length
      ? losers.reduce((a, l) => a + (l.d?.short || 0), 0)
      : null;

    const guilty = losers.map((l) => l.punter);
    const innocents = punters.length - guilty.length;
    const maxOthers = Math.max(1, punters.length - 1);

    const moves = {};
    punters.forEach((p) => {
      const leg = legs.find((l) => l.punter === p);
      let pct = 0;
      if (leg && leg.result === "WIN") {
        pct = Math.min((leg.odds - 1) * WIN_MULT, WIN_CAP);
        streak[p] += 1;
        bestStreak[p] = Math.max(bestStreak[p], streak[p]);
      } else if (leg && leg.result === "LOSE") {
        pct = -Math.min((1 / leg.odds) * LOSS_MULT, LOSS_MULT);
        streak[p] = 0;
      }
      if (accaWon) pct += DIVIDEND;
      if (leg && leg.result === "LOSE") {
        /* Shame is divided. Alone in the stocks costs the most. */
        pct -= PILLORY * (innocents / maxOthers);
        stocksCount[p] += 1;
        tomatoes[p] += innocents;
      }
      const before = price[p];
      price[p] = Math.max(FLOOR, before * (1 + pct / 100));
      moves[p] = { pct, before, after: price[p] };
      weekly[p].push({ gw, pct, price: price[p] });
    });

    history.push({
      gw, label: roman(gw),
      ...Object.fromEntries(punters.map((p) => [p, +price[p].toFixed(2)])),
    });

    weeks.push({
      gw, date: legs[0]?.date || "", legs, accaWon, sole, guilty, innocents,
      stake, combined, returned, wouldHave, goalsShort, moves,
    });
  });

  const stats = punters.map((p) => {
    const legs = clean.filter((r) => r.punter === p && r.result !== "VOID");
    const wins = legs.filter((l) => l.result === "WIN");
    const w = weekly[p];
    const best = w.length ? w.reduce((a, b) => (b.pct > a.pct ? b : a)) : null;
    const worst = w.length ? w.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;
    const home = legs.filter((l) => l.venue === "H");
    const away = legs.filter((l) => l.venue === "A");
    const homeWins = home.filter((l) => l.result === "WIN").length;
    const awayWins = away.filter((l) => l.result === "WIN").length;
    const withScore = legs.filter((l) => l.d);
    return {
      punter: p,
      price: price[p],
      played: legs.length,
      wins: wins.length,
      hitRate: legs.length ? wins.length / legs.length : 0,
      avgOdds: legs.length ? legs.reduce((a, l) => a + l.odds, 0) / legs.length : 0,
      bestLanded: wins.length ? Math.max(...wins.map((l) => l.odds)) : 0,
      stocks: stocksCount[p],
      tomatoes: tomatoes[p],
      cost: cost[p],
      streak: bestStreak[p],
      current: streak[p],
      bestWeek: best,
      worstWeek: worst,
      last: w.length ? w[w.length - 1].pct : 0,
      spark: [START_PRICE, ...w.map((x) => x.price)],
      home: home.length,
      away: away.length,
      homeWins,
      awayWins,
      homeShare: legs.length ? home.length / legs.length : 0,
      homeRate: home.length ? homeWins / home.length : null,
      awayRate: away.length ? awayWins / away.length : null,
      squeakers: withScore.filter((l) => l.result === "WIN" && l.d.margin === 1).length,
      agonies: withScore.filter((l) => l.result === "LOSE" && l.d.short === 1).length,
      mismatches: withScore.filter((l) => l.d.derived !== l.result).length,
    };
  });

  const settled = clean.filter((r) => r.result === "WIN" || r.result === "LOSE");
  const allHome = settled.filter((r) => r.venue === "H");
  const allAway = settled.filter((r) => r.venue === "A");

  const lastWeek = weeks.length ? weeks[weeks.length - 1] : null;

  return {
    punters,
    stats: stats.sort((a, b) => b.price - a.price),
    history,
    weeks,
    lastWeek,
    staked: weeks.reduce((a, w) => a + w.stake, 0),
    returned: weeks.reduce((a, w) => a + w.returned, 0),
    accasWon: weeks.filter((w) => w.accaWon).length,
    nearMisses: weeks.filter((w) => w.sole).length,
    forgone: weeks.filter((w) => w.sole).reduce((a, w) => a + w.wouldHave, 0),
    inStocks: lastWeek?.guilty || [],
    venue: {
      homePicks: allHome.length,
      awayPicks: allAway.length,
      homeRate: allHome.length ? allHome.filter((r) => r.result === "WIN").length / allHome.length : null,
      awayRate: allAway.length ? allAway.filter((r) => r.result === "WIN").length / allAway.length : null,
      homeOdds: allHome.length ? allHome.reduce((a, r) => a + r.odds, 0) / allHome.length : 0,
      awayOdds: allAway.length ? allAway.reduce((a, r) => a + r.odds, 0) / allAway.length : 0,
    },
  };
}

export function pick(stats, score, fmt) {
  if (!stats.length) return { w: "—", v: "" };
  const best = stats.reduce((a, b) => (score(b) > score(a) ? b : a));
  return { w: best.punter, v: fmt(best) };
}

export function awardsFor(market) {
  const top = market.stats[0];
  return [
    { t: "Merchant Prince", d: "Highest closing price", w: top?.punter, v: `ƒ${f(top?.price || 0)}` },
    { t: "The Giant Slayer", d: "Longest price successfully landed",
      ...pick(market.stats, (s) => s.bestLanded, (s) => s.bestLanded.toFixed(2)) },
    { t: "The Oracle", d: "Best strike rate",
      ...pick(market.stats, (s) => s.hitRate, (s) => `${Math.round(s.hitRate * 100)}%`) },
    { t: "The Reckless Duke", d: "Highest average odds",
      ...pick(market.stats, (s) => s.avgOdds, (s) => s.avgOdds.toFixed(2)) },
    { t: "The Miser", d: "Lowest average odds — the banker merchant",
      ...pick(market.stats, (s) => -s.avgOdds, (s) => s.avgOdds.toFixed(2)) },
    { t: "The Rotten Harvest", d: "Most weeks pilloried",
      ...pick(market.stats, (s) => s.stocks, (s) => `${s.stocks} weeks · ${s.tomatoes} tomatoes`) },
    { t: "The Costliest Hand", d: "Whose solo failures cost the table most",
      ...pick(market.stats, (s) => s.cost, (s) => `£${s.cost.toFixed(0)} forgone`) },
    { t: "The Homebody", d: "Leans hardest on home advantage",
      ...pick(market.stats, (s) => s.homeShare, (s) => `${Math.round(s.homeShare * 100)}% at home`) },
    { t: "The Wanderer", d: "Most away legs landed",
      ...pick(market.stats, (s) => s.awayWins, (s) => `${s.awayWins} of ${s.away}`) },
    { t: "By a Whisker", d: "Most legs landed by a single goal",
      ...pick(market.stats, (s) => s.squeakers, (s) => `${s.squeakers} of ${s.wins}`) },
    { t: "One Goal Short", d: "Most legs that fell a single goal short",
      ...pick(market.stats, (s) => s.agonies, (s) => `${s.agonies} times`) },
    { t: "The Unbroken Line", d: "Longest winning run",
      ...pick(market.stats, (s) => s.streak, (s) => `${s.streak} weeks`) },
    { t: "The Alchemist", d: "Biggest single week",
      ...pick(market.stats, (s) => s.bestWeek?.pct ?? -999, (s) => pctStr(s.bestWeek?.pct ?? 0)) },
  ];
}
