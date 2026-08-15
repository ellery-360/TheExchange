"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase/client";
import { roman } from "../lib/engine";

const EXTRAS = ["NONE", "BTTS", "O1.5", "BTTS+O1.5"];

export default function EntryDesk({ members, weeks, email }) {
  const supabase = createClient();
  const nextGw = weeks.length ? Math.max(...weeks.map((w) => w.gw)) + 1 : 1;

  const [tab, setTab] = useState("picks");
  const [gw, setGw] = useState(nextGw);
  const [date, setDate] = useState(nextSaturday());
  const [stake, setStake] = useState(25);
  const [legs, setLegs] = useState(
    members.map((m) => ({ punter: m, team: "", venue: "H", opponent: "", odds: "", extra: "NONE" }))
  );
  const [scores, setScores] = useState([]);
  const [scoreGw, setScoreGw] = useState(weeks[0]?.gw ?? null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const setLeg = (i, k, v) =>
    setLegs((prev) => prev.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  const loadScores = useCallback(async (targetGw) => {
    if (targetGw === null) return;
    const { data } = await supabase
      .from("legs")
      .select("id, punter, team, venue, opponent, extra, odds, gf, ga, result")
      .eq("gw", targetGw)
      .order("punter");
    setScores(
      (data || []).map((r) => ({ ...r, gf: r.gf ?? "", ga: r.ga ?? "" }))
    );
  }, [supabase]);

  useEffect(() => {
    if (tab === "scores") loadScores(scoreGw);
  }, [tab, scoreGw, loadScores]);

  async function savePicks() {
    const filled = legs.filter((l) => l.team.trim() && parseFloat(l.odds) > 1);
    if (filled.length !== members.length) {
      setNote(`All ${members.length} legs need a team and a price above 1.00.`);
      return;
    }
    setBusy(true);
    setNote("");

    const { error: wErr } = await supabase
      .from("weeks")
      .upsert({ gw, match_date: date, stake, placed_at: new Date().toISOString() });
    if (wErr) { setNote(wErr.message); setBusy(false); return; }

    const { error: lErr } = await supabase.from("legs").upsert(
      filled.map((l) => ({
        gw,
        punter: l.punter,
        team: l.team.trim(),
        venue: l.venue,
        opponent: l.opponent.trim(),
        extra: l.extra,
        odds: parseFloat(l.odds),
      })),
      { onConflict: "gw,punter" }
    );

    setBusy(false);
    if (lErr) setNote(lErr.message);
    else {
      setNote(`Week ${roman(gw)} locked in.`);
      setGw(gw + 1);
      setLegs(members.map((m) => ({ punter: m, team: "", venue: "H", opponent: "", odds: "", extra: "NONE" })));
    }
  }

  async function saveScores() {
    setBusy(true);
    setNote("");
    for (const s of scores) {
      const payload =
        s.result === "VOID"
          ? { gf: null, ga: null, result: "VOID" }
          : { gf: s.gf === "" ? null : parseInt(s.gf, 10), ga: s.ga === "" ? null : parseInt(s.ga, 10) };
      const { error } = await supabase.from("legs").update(payload).eq("id", s.id);
      if (error) { setNote(error.message); setBusy(false); return; }
    }
    setBusy(false);
    setNote("Scores settled. The market has moved.");
    loadScores(scoreGw);
  }

  return (
    <div className="desk">
      <header className="masthead compact">
        <h1 className="black">The Entry Desk</h1>
        <p className="sub">{email}</p>
        <Link className="btn ghost" href="/">View the bourse</Link>
      </header>

      <div className="tabs">
        <button className={`chip ${tab === "picks" ? "on" : ""}`} onClick={() => setTab("picks")}>
          Saturday picks
        </button>
        <button className={`chip ${tab === "scores" ? "on" : ""}`} onClick={() => setTab("scores")}>
          Settle scores
        </button>
      </div>

      {tab === "picks" && (
        <section className="panel">
          <h2 className="rubric">Week {roman(gw)}</h2>
          <div className="meta">
            <label>Week<input type="number" value={gw} onChange={(e) => setGw(+e.target.value)} /></label>
            <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label>Stake £<input type="number" step="0.01" value={stake} onChange={(e) => setStake(+e.target.value)} /></label>
          </div>

          {legs.map((l, i) => (
            <div className="legrow" key={l.punter}>
              <span className="legname">{l.punter}</span>
              <input placeholder="Team" value={l.team} onChange={(e) => setLeg(i, "team", e.target.value)} />
              <select value={l.venue} onChange={(e) => setLeg(i, "venue", e.target.value)}>
                <option value="H">Home</option><option value="A">Away</option>
              </select>
              <input placeholder="Opponent" value={l.opponent} onChange={(e) => setLeg(i, "opponent", e.target.value)} />
              <select value={l.extra} onChange={(e) => setLeg(i, "extra", e.target.value)}>
                {EXTRAS.map((x) => <option key={x} value={x}>{x === "NONE" ? "No extra" : x}</option>)}
              </select>
              <input className="odds" placeholder="Odds" inputMode="decimal"
                value={l.odds} onChange={(e) => setLeg(i, "odds", e.target.value)} />
            </div>
          ))}

          <button className="btn" onClick={savePicks} disabled={busy}>
            {busy ? "Saving…" : "Lock in the week"}
          </button>
          {note && <p className="msg good">{note}</p>}
        </section>
      )}

      {tab === "scores" && (
        <section className="panel">
          <h2 className="rubric">Settle</h2>
          <div className="weeks">
            {weeks.map((w) => (
              <button key={w.gw} className={`chip ${scoreGw === w.gw ? "on" : ""}`}
                onClick={() => setScoreGw(w.gw)}>{roman(w.gw)}</button>
            ))}
          </div>
          <p className="hint">
            Goals for and against <em>your selected team</em>. The database works out whether the
            leg won, including BTTS and Over 1.5 — you never set the result by hand.
          </p>
          {scores.map((s, i) => (
            <div className="scorerow" key={s.id}>
              <span className="legname">{s.punter}</span>
              <span className="sel">
                {s.team} <em>({s.venue})</em> v {s.opponent}
                {s.extra !== "NONE" && <b> + {s.extra}</b>}
              </span>
              <input className="g" inputMode="numeric" placeholder="—" value={s.gf}
                onChange={(e) => setScores((p) => p.map((x, j) => (j === i ? { ...x, gf: e.target.value } : x)))} />
              <span className="dash">–</span>
              <input className="g" inputMode="numeric" placeholder="—" value={s.ga}
                onChange={(e) => setScores((p) => p.map((x, j) => (j === i ? { ...x, ga: e.target.value } : x)))} />
              <button className={`void ${s.result === "VOID" ? "on" : ""}`}
                onClick={() => setScores((p) => p.map((x, j) =>
                  (j === i ? { ...x, result: x.result === "VOID" ? null : "VOID" } : x)))}>
                P–P
              </button>
              <span className={`res ${String(s.result || "").toLowerCase()}`}>{s.result || ""}</span>
            </div>
          ))}
          {scores.length > 0 && (
            <button className="btn" onClick={saveScores} disabled={busy}>
              {busy ? "Settling…" : "Settle the week"}
            </button>
          )}
          {note && <p className="msg good">{note}</p>}
        </section>
      )}
    </div>
  );
}

function nextSaturday() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return d.toISOString().slice(0, 10);
}
