"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPasscode, grant, revoke, isSteward } from "../lib/auth";
import { admin } from "../lib/supabase/admin";

/* ------------------------------------------------------------------ */
export async function signIn(prevState, formData) {
  const ok = checkPasscode(formData.get("passcode"));
  if (!ok) return { error: "Wrong passcode." };
  grant();
  redirect("/enter");
}

export async function signOut() {
  revoke();
  redirect("/");
}

/* ------------------------------------------------------------------
 *  Every write below re-checks the passcode cookie server-side.
 *  A browser cannot reach the database directly — row level security
 *  denies all writes, and the secret key never leaves the server.
 * ---------------------------------------------------------------- */
function guard() {
  if (!isSteward()) throw new Error("Not authorised");
}

export async function savePicks(prevState, formData) {
  guard();

  const gw = parseInt(formData.get("gw"), 10);
  const date = formData.get("date");
  const stake = parseFloat(formData.get("stake"));
  const punters = formData.getAll("punter");

  if (!gw || !date || !(stake > 0)) return { error: "Week, date and stake are required." };

  const legs = punters.map((p, i) => ({
    gw,
    punter: p,
    team: String(formData.getAll("team")[i] || "").trim(),
    venue: formData.getAll("venue")[i] === "A" ? "A" : "H",
    opponent: String(formData.getAll("opponent")[i] || "").trim(),
    ...(() => {
      const [needs, extra] = String(formData.getAll("market")[i] || "WIN|NONE").split("|");
      return { extra: extra || "NONE", needs_win: needs !== "ANY" };
    })(),
    odds: parseFloat(formData.getAll("odds")[i]),
  }));

  const bad = legs.find((l) => !l.team || !(l.odds > 1));
  if (bad) return { error: `${bad.punter} needs a team and a price above 1.00.` };

  const db = admin();

  const { error: wErr } = await db
    .from("weeks")
    .upsert({ gw, match_date: date, stake, placed_at: new Date().toISOString() });
  if (wErr) return { error: wErr.message };

  const { error: lErr } = await db.from("legs").upsert(legs, { onConflict: "gw,punter" });
  if (lErr) return { error: lErr.message };

  revalidatePath("/");
  revalidatePath("/enter");
  return { ok: `Week ${gw} locked in.` };
}

export async function saveScores(prevState, formData) {
  guard();

  const ids = formData.getAll("id");
  const gfs = formData.getAll("gf");
  const gas = formData.getAll("ga");
  const voids = formData.getAll("void");

  const db = admin();

  for (let i = 0; i < ids.length; i++) {
    const isVoid = voids[i] === "1";
    const payload = isVoid
      ? { gf: null, ga: null, result: "VOID" }
      : {
          gf: gfs[i] === "" ? null : parseInt(gfs[i], 10),
          ga: gas[i] === "" ? null : parseInt(gas[i], 10),
          result: null,
        };
    const { error } = await db.from("legs").update(payload).eq("id", ids[i]);
    if (error) return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/enter");
  return { ok: "Scores settled. The market has moved." };
}
