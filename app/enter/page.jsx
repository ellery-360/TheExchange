import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import EntryDesk from "../../components/EntryDesk";

export const dynamic = "force-dynamic";

export default async function Enter() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: members }, { data: weeks }] = await Promise.all([
    supabase.from("members").select("display_name").order("display_name"),
    supabase.from("weeks").select("gw, match_date, stake").order("gw", { ascending: false }),
  ]);

  return (
    <EntryDesk
      members={(members || []).map((m) => m.display_name)}
      weeks={weeks || []}
      email={user.email}
    />
  );
}
