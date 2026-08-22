"use client";
import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import Pillory, { Spark } from "./Pillory";
import { createClient } from "../lib/supabase/client";
import { configured } from "../lib/supabase/env";
import {
  buildMarket, awardsFor, roman, f, pctStr, list, PIGMENTS, START_PRICE, FINAL,
} from "../lib/engine";

export default function Exchange({ initialRows, signedIn }) {
  const [rows, setRows] = useState(initialRows || []);
  const [gwView, setGwView] = useState(null);

  /* Live: anyone entering results updates every open browser. */
  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    const channel = supabase
      .channel("exchange-legs")
      .on("postgres_changes", { event: "*", schema: "public", table: "legs" }, async () => {
        const { data } = await supabase.from("ledger").select("*");
        if (data) setRows(data);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const market = useMemo(() => buildMarket(rows), [rows]);
  const colourOf = (p) => PIGMENTS[market.punters.indexOf(p) % PIGMENTS.length];

  if (!market.punters.length) {
    return (
      <div className="empty">
        <h1 className="black">The Exchange</h1>
        <p>No ledger yet. The bourse opens once the first week is entered.</p>
        <Link className="btn" href={signedIn ? "/enter" : "/login"}>
          {signedIn ? "Enter a week" : "Steward sign in"}
        </Link>
      </div>
    );
  }

  const week = gwView ? market.weeks.find((w) => w.gw === gwView) : market.lastWeek;
  const pnl = market.returned - market.staked;
  const awards = awardsFor(market);
  const liveFor = (p) => Boolean(market.lastWeek?.legs?.find((l) => l.punter === p && l.live));
  const stocked = (market.lastWeek?.guilty || []).map((name) => ({
    name,
    tomatoes: market.stats.find((s) => s.punter === name)?.tomatoes || 0,
  }));

  return (
    <>
      <header className="masthead">
        <div className="crest">✦</div>
        <h1 className="black">The Exchange</h1>
        <p className="sub">Royal Bourse of the Footballing Realm · Saturday, Three of the Clock</p>
        <Link className="btn ghost" href={signedIn ? "/enter" : "/login"}>
          {signedIn ? "Enter results" : "Steward"}
        </Link>
      </header>

      <div className="ticker" aria-hidden="true">
        <div className="crawl">
          {[0, 1].map((k) => (
            <span key={k}>
              {market.stats.map((s) => (
                <span key={s.punter} className="tick">
                  <em>{s.punter}</em>
                  <b>ƒ{f(s.price)}</b>
                  <i className={s.last >= 0 ? "up" : "down"}>
                    {s.last >= 0 ? "▲" : "▼"} {pctStr(s.last)}
                  </i>
                </span>
              ))}
              <span className="tick crier">Hear ye — the bourse closes at the final whistle —</span>
            </span>
          ))}
        </div>
      </div>

      {market.lastWeek?.live && (
        <div className="liveband">
          <span className="dot" />
          Matches in play — prices are provisional and settle at full time
        </div>
      )}

      <main className="grid">
        <section className="panel bourse">
          <h2 className="rubric">The Bourse</h2>
          <ol className="holdings">
            {market.stats.map((s, i) => (
              <li key={s.punter} className="holding" style={{ "--c": colourOf(s.punter) }}>
                <span className="rank">{roman(i + 1)}</span>
                <div className="who">
                  <strong>{s.punter}</strong>
                  <small>
                    {s.wins}/{s.played} landed · avg {s.avgOdds.toFixed(2)}
                    {s.current > 1 && <span className="hot"> · {s.current} in a row</span>}
                  </small>
                </div>
                <Spark data={s.spark} colour={colourOf(s.punter)} />
                <div className="price">
                  <b className={liveFor(s.punter) ? "beat" : ""}>ƒ{f(s.price)}</b>
                  <i className={s.last >= 0 ? "up" : "down"}>{pctStr(s.last)}</i>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={`panel stocks ${stocked.length >= 3 ? "wide" : ""}`}>
          <h2 className="rubric">The Stocks</h2>
          {market.lastWeek?.live ? (
            <div className="clear">
              <div className="seal live">?</div>
              <p className="verdict">
                Judgement is reserved while matches are in play. The stocks are
                filled at full time.
              </p>
            </div>
          ) : stocked.length > 0 ? (
            <>
              <Pillory occupants={stocked} />
              <p className="verdict">
                {stocked.length === 1 ? (
                  <>
                    <strong>{stocked[0].name}</strong> alone broke the acca in week{" "}
                    {roman(market.lastWeek.gw)}. Full penalty, four tomatoes, no company.
                  </>
                ) : stocked.length === market.punters.length ? (
                  <>
                    All <strong>{stocked.length}</strong> legs went down in week{" "}
                    {roman(market.lastWeek.gw)}. Nobody is left to throw anything, which is its own
                    kind of disgrace.
                  </>
                ) : (
                  <>
                    <strong>{list(stocked.map((s) => s.name))}</strong> share the post in week{" "}
                    {roman(market.lastWeek.gw)}. {market.lastWeek.innocents} still standing, so{" "}
                    {market.lastWeek.innocents} tomatoes each and a lighter penalty. Company is mercy.
                  </>
                )}
              </p>
            </>
          ) : (
            <div className="clear">
              <div className="seal">✷</div>
              <p className="verdict">
                Every leg landed in week {roman(market.lastWeek?.gw || 0)}. The stocks stand empty
                and a dividend was paid to all.
              </p>
            </div>
          )}
        </section>

        <section className="panel chart">
          <h2 className="rubric">Price History</h2>
          <div className="chartbox">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={market.history} margin={{ top: 8, right: 12, bottom: 4, left: -14 }}>
                <XAxis dataKey="label" stroke="#6E6553"
                  tick={{ fontSize: 11, fill: "#6E6553", fontFamily: "'Courier Prime', monospace" }} />
                <YAxis stroke="#6E6553"
                  tick={{ fontSize: 11, fill: "#6E6553", fontFamily: "'Courier Prime', monospace" }} />
                <ReferenceLine y={START_PRICE} stroke="#6E6553" strokeDasharray="3 4" />
                <Tooltip
                  contentStyle={{
                    background: "#1C1913", border: "1px solid #C9A227", borderRadius: 0,
                    fontFamily: "'Courier Prime', monospace", fontSize: 12, color: "#E7DCC4",
                  }}
                  labelStyle={{ color: "#C9A227" }}
                  formatter={(v) => [`ƒ${v}`, ""]}
                />
                {market.punters.map((p) => (
                  <Line key={p} type="monotone" dataKey={p} stroke={colourOf(p)} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="key">
            {market.punters.map((p) => (
              <span key={p}><i style={{ background: colourOf(p) }} />{p}</span>
            ))}
          </div>
        </section>

        <section className="panel ledger">
          <h2 className="rubric">The Ledger</h2>
          <div className="weeks">
            {market.weeks.map((w) => (
              <button key={w.gw}
                className={`chip ${week?.gw === w.gw ? "on" : ""} ${w.accaWon ? "won" : ""}`}
                onClick={() => setGwView(w.gw)}>
                {roman(w.gw)}
              </button>
            ))}
          </div>
          {week && (
            <>
              <div className="scroller">
                <table>
                  <thead>
                    <tr><th>Merchant</th><th>Selection</th><th>Extra</th><th>Price</th><th>Score</th><th>Result</th><th>Move</th></tr>
                  </thead>
                  <tbody>
                    {week.legs.map((l, i) => (
                      <tr key={i} className={l.result.toLowerCase()}>
                        <td className="nm" style={{ borderLeftColor: colourOf(l.punter) }}>{l.punter}</td>
                        <td>
                          {l.team}
                          {l.needsWin
                            ? <span className={`vb ${l.venue === "H" ? "h" : "a"}`}>{l.venue}</span>
                            : <span className="vb goals">GOALS</span>}
                          <small> v {l.opponent}</small>
                        </td>
                        <td className="mono">{l.extra === "NONE" ? "—" : l.extra}</td>
                        <td className="mono">{l.odds.toFixed(2)}</td>
                        <td className="mono sc">
                          {l.d ? l.d.score : "—"}
                          {l.live && (
                            <em className="livemin">
                              {l.status === "HT" ? "HT" : `${l.minute ?? ""}'`}
                            </em>
                          )}
                          {l.d && l.result === "LOSE" && l.d.short > 0 && <em className="short">{l.d.short} short</em>}
                          {l.d && l.result === "WIN" && l.d.margin === 1 && <em className="tight">by one</em>}
                        </td>
                        <td className={`mono res ${l.provisional ? "prov" : ""}`}>{l.result}{l.provisional && "*"}</td>
                        <td className={`mono ${week.moves[l.punter]?.pct >= 0 ? "up" : "down"}`}>
                          {pctStr(week.moves[l.punter]?.pct || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="settle">
                Combined <b>{week.combined.toFixed(2)}</b> · staked <b>£{week.stake.toFixed(2)}</b> ·
                returned <b className={week.returned ? "up" : "down"}>£{week.returned.toFixed(2)}</b>
                {week.guilty.length > 0 && (
                  <> · <span className="down">
                    {list(week.guilty)} to the post
                    {week.sole && `, costing the table £${week.wouldHave.toFixed(2)}`}
                  </span></>
                )}
              </p>
              {!week.accaWon && week.goalsShort !== null && week.goalsShort > 0 && (
                <p className="obit">
                  This week died by <b>{week.goalsShort}</b> goal{week.goalsShort === 1 ? "" : "s"}.
                </p>
              )}
            </>
          )}
        </section>

        <section className="panel venue">
          <h2 className="rubric">Home Comforts</h2>
          <p className="vsum">
            The table has backed <b>{market.venue.homePicks}</b> home sides and{" "}
            <b>{market.venue.awayPicks}</b> away.
            {market.venue.homeRate !== null && (
              <> Home picks land <b className="up">{Math.round(market.venue.homeRate * 100)}%</b> of
                the time at an average <b>{market.venue.homeOdds.toFixed(2)}</b>.</>
            )}
            {market.venue.awayRate !== null && (
              <> Away picks land <b className="up">{Math.round(market.venue.awayRate * 100)}%</b> at{" "}
                <b>{market.venue.awayOdds.toFixed(2)}</b>.</>
            )}
          </p>
          <ul className="vlist">
            {[...market.stats].sort((a, b) => b.homeShare - a.homeShare).map((s) => (
              <li key={s.punter}>
                <span className="vname">{s.punter}</span>
                <span className="vbar"><i style={{ width: `${s.homeShare * 100}%` }} /></span>
                <span className="vnum">{Math.round(s.homeShare * 100)}% home</span>
                <span className="vrate mono">
                  H {s.homeRate === null ? "—" : `${Math.round(s.homeRate * 100)}%`} ({s.home})
                  {"  "}·{"  "}
                  A {s.awayRate === null ? "—" : `${Math.round(s.awayRate * 100)}%`} ({s.away})
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel counting">
          <h2 className="rubric">The Counting House</h2>
          <p className="vsum">
            Winnings are split by each leg&apos;s share of the combined price, so a long
            shout is credited more than a banker sitting beside it. Costs are the
            forgone returns from weeks a merchant broke the acca alone.
          </p>
          <div className="scroller">
            <table>
              <thead>
                <tr><th>Merchant</th><th>Brought in</th><th>Cost</th><th>Net</th><th /></tr>
              </thead>
              <tbody>
                {[...market.stats].sort((a, b) => b.net - a.net).map((s) => {
                  const scale = Math.max(
                    1, ...market.stats.map((x) => Math.abs(x.net))
                  );
                  const w = (Math.abs(s.net) / scale) * 50;
                  return (
                    <tr key={s.punter}>
                      <td className="nm" style={{ borderLeftColor: colourOf(s.punter) }}>{s.punter}</td>
                      <td className="mono up">{s.earned > 0 ? `£${s.earned.toFixed(0)}` : "—"}</td>
                      <td className="mono down">{s.cost > 0 ? `£${s.cost.toFixed(0)}` : "—"}</td>
                      <td className={`mono net ${s.net >= 0 ? "up" : "down"}`}>
                        {s.net >= 0 ? "+" : "−"}£{Math.abs(s.net).toFixed(0)}
                      </td>
                      <td className="tug">
                        <span className="axis" />
                        <span className={`bar ${s.net >= 0 ? "pos" : "neg"}`}
                          style={s.net >= 0
                            ? { left: "50%", width: `${w}%` }
                            : { right: "50%", width: `${w}%` }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel season">
          <h2 className="rubric">The Season</h2>
          <div className="figures">
            <div><span>ƒ</span><b>{market.weeks.length}</b><small>weeks traded</small></div>
            <div><span>✓</span><b>{market.accasWon}</b><small>accas landed</small></div>
            <div><span>£</span><b>{market.staked.toFixed(0)}</b><small>staked</small></div>
            <div><span>£</span><b>{market.returned.toFixed(0)}</b><small>returned</small></div>
            <div className="down"><span>✕</span><b>{market.nearMisses}</b><small>one leg short</small></div>
            <div className="down"><span>£</span><b>{market.forgone.toFixed(0)}</b><small>forgone</small></div>
            <div className={pnl >= 0 ? "up" : "down"}>
              <span>{pnl >= 0 ? "▲" : "▼"}</span>
              <b>{pnl >= 0 ? "+" : ""}{pnl.toFixed(0)}</b><small>profit</small>
            </div>
          </div>
        </section>

        <section className="panel honours">
          <h2 className="rubric">Honours of the Realm</h2>
          <div className="awards">
            {awards.map((a) => (
              <article key={a.t}>
                <h3>{a.t}</h3>
                <p className="d">{a.d}</p>
                <p className="w">{a.w || "—"}<span>{a.v}</span></p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel rules">
          <h2 className="rubric">How the Market Moves</h2>
          <ul>
            <li><b>Everyone opens at ƒ100.</b> Your price is your reputation, and nothing else.</li>
            <li><b>A winning leg pays (odds − 1) × 6%.</b> A 1.50 banker earns 3%. A 4.00 shout earns 18%. Capped at 40%.</li>
            <li><b>A losing leg costs implied probability × 20%.</b> Losing a 1.20 certainty takes 16.7% off you. Losing a 6.00 punt costs 3.3%. The market punishes confidence, not ambition.</li>
            <li><b>The acca landing pays a dividend of 8%</b> to every merchant, whatever they picked.</li>
            <li><b>Every losing leg goes in the stocks.</b> No hiding behind company.</li>
            <li><b>You take one tomato from each punter still standing.</b> Alone that's four. Two of you, three each. All five down and nobody is left to throw anything, which is worse.</li>
            <li><b>The price penalty scales the same way</b> — the full 12% alone, 9% if two of you, down to nothing when everybody failed. Company is mercy.</li>
            <li><b>Only a solo failure is charged the forgone winnings.</b> If two legs went down, neither alone cost you the acca.</li>
            <li><b>Postponed is VOID.</b> Price unchanged, leg struck from the acca.</li>
          </ul>
        </section>
      </main>

      <footer>Struck at the market cross · settled at the final whistle</footer>
    </>
  );
}
