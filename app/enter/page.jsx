import { redirect } from "next/navigation";
import { isSteward } from "../../lib/auth";
import { createClient } from "../../lib/supabase/server";
import EntryDesk from "../../components/EntryDesk";

export const dynamic = "force-dynamic";

export default async function Enter() {
  if (!isSteward()) redirect("/login");

  const supabase = createClient();
  const [{ data: members }, { data: weeks }, { data: legs }] = await Promise.all([
    supabase.from("members").select("display_name").order("display_name"),
    supabase.from("weeks").select("gw, match_date, stake").order("gw", { ascending: false }),
    supabase.from("legs").select("id, gw, punter, team, venue, opponent, extra, needs_win, odds, gf, ga, result").order("punter"),
  ]);

  return (
    <EntryDesk
      members={(members || []).map((m) => m.display_name)}
      weeks={weeks || []}
      legs={legs || []}
    />
  );
}
