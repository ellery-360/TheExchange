import Exchange from "../components/Exchange";
import { createClient } from "../lib/supabase/server";
import { configured } from "../lib/supabase/env";
import { isSteward } from "../lib/auth";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!configured) {
    return (
      <div className="empty">
        <h1 className="black">The Exchange</h1>
        <p>
          Not connected yet. Set NEXT_PUBLIC_SUPABASE_URL and either
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY,
          then reload.
        </p>
      </div>
    );
  }

  const supabase = createClient();
  const { data: rows } = await supabase.from("ledger").select("*");

  return <Exchange initialRows={rows || []} signedIn={isSteward()} />;
}
