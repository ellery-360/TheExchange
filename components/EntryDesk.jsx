"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { savePicks, saveScores, signOut } from "../app/actions";
import { roman } from "../lib/engine";

/* value encodes both the extra and whether a win is required */
const MARKETS = [
  { v: "WIN|NONE",       label: "Win" },
  { v: "WIN|BTTS",       label: "Win + BTTS" },
  { v: "WIN|O1.5",       label: "Win + O1.5" },
  { v: "WIN|BTTS+O1.5",  label: "Win + BTTS + O1.5" },
  { v: "ANY|BTTS",       label: "BTTS only" },
  { v: "ANY|O1.5",       label: "Over 1.5 only" },
  { v: "ANY|BTTS+O1.5",  label: "BTTS + O1.5 only" },
];

function Submit({ idle, busy }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? busy : idle}
    </button>
  );
}

export default function EntryDesk({ members, weeks, legs }) {
  const nextGw = weeks.length ? Math.max(...weeks.map((w) => w.gw)) + 1 : 1;
  const [tab, setTab] = useState("picks");
  const [scoreGw, setScoreGw] = useState(weeks[0]?.gw ?? null);

  const [pickState, pickAction] = useFormState(savePicks, {});
  const [scoreState, scoreAction] = useFormState(saveScores, {});

  const weekLegs = legs.filter((l) => l.gw === scoreGw);

  return (
    <div className="desk">
      <header className="masthead compact">
        <h1 className="black">The Entry Desk</h1>
        <p className="sub">Steward</p>
        <div className="row centred">
          <Link className="btn ghost" href="/">View the bourse</Link>
          <form action={signOut}>
            <button className="btn ghost" type="submit">Sign out</button>
          </form>
        </div>
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
        <form action={pickAction} className="panel">
          <h2 className="rubric">New week</h2>
          <div className="meta">
            <label>Week<input type="number" name="gw" defaultValue={nextGw} /></label>
            <label>Date<input type="date" name="date" defaultValue={nextSaturday()} /></label>
            <label>Stake £<input type="number" step="0.01" name="stake" defaultValue={25} /></label>
          </div>

          {members.map((m) => (
            <div className="legrow" key={m}>
              <span className="legname">{m}</span>
              <input type="hidden" name="punter" value={m} />
              <input name="team" placeholder="Team" />
              <select name="venue" defaultValue="H">
                <option value="H">Home</option><option value="A">Away</option>
              </select>
              <input name="opponent" placeholder="Opponent" />
              <select name="market" defaultValue="WIN|NONE">
                {MARKETS.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
              </select>
              <input className="odds" name="odds" placeholder="Odds" inputMode="decimal" />
            </div>
          ))}

          <Submit idle="Lock in the week" busy="Saving…" />
          {pickState?.error && <p className="msg bad">{pickState.error}</p>}
          {pickState?.ok && <p className="msg good">{pickState.ok}</p>}
        </form>
      )}

      {tab === "scores" && (
        <div className="panel">
          <h2 className="rubric">Settle</h2>
          <div className="weeks">
            {weeks.map((w) => (
              <button key={w.gw} className={`chip ${scoreGw === w.gw ? "on" : ""}`}
                onClick={() => setScoreGw(w.gw)}>{roman(w.gw)}</button>
            ))}
          </div>
          <p className="hint">
            Goals for and against <em>the selected team</em>. The database works out whether the
            leg won, including BTTS and Over 1.5 — the result is never set by hand.
          </p>

          <form action={scoreAction} key={scoreGw}>
            {weekLegs.map((l) => <ScoreRow key={l.id} leg={l} />)}
            {weekLegs.length > 0 && <Submit idle="Settle the week" busy="Settling…" />}
          </form>

          {scoreState?.error && <p className="msg bad">{scoreState.error}</p>}
          {scoreState?.ok && <p className="msg good">{scoreState.ok}</p>}
        </div>
      )}
    </div>
  );
}

function ScoreRow({ leg }) {
  const [isVoid, setVoid] = useState(leg.result === "VOID");
  return (
    <div className="scorerow">
      <span className="legname">{leg.punter}</span>
      <span className="sel">
        {leg.needs_win
          ? <>{leg.team} <em>({leg.venue})</em> v {leg.opponent}</>
          : <>{leg.team} v {leg.opponent}</>}
        {leg.extra !== "NONE" && <b> {leg.needs_win ? "+" : "\u00b7"} {leg.extra}</b>}
      </span>
      <input type="hidden" name="id" value={leg.id} />
      <input type="hidden" name="void" value={isVoid ? "1" : "0"} />
      <input className="g" name="gf" inputMode="numeric" placeholder="—"
        defaultValue={leg.gf ?? ""} readOnly={isVoid} />
      <span className="dash">–</span>
      <input className="g" name="ga" inputMode="numeric" placeholder="—"
        defaultValue={leg.ga ?? ""} readOnly={isVoid} />
      <button type="button" className={`void ${isVoid ? "on" : ""}`} onClick={() => setVoid(!isVoid)}>
        P–P
      </button>
      <span className={`res ${String(leg.result || "").toLowerCase()}`}>{leg.result || ""}</span>
    </div>
  );
}

function nextSaturday() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return d.toISOString().slice(0, 10);
}
