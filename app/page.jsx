import Exchange from "../components/Exchange";
import { createClient } from "../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return (
      <div className="empty">
        <h1 className="black">The Exchange</h1>
        <p>
          Not connected yet. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY, then reload.
        </p>
      </div>
    );
  }

  const supabase = createClient();
  const [{ data: rows }, { data: { user } }] = await Promise.all([
    supabase.from("ledger").select("*"),
    supabase.auth.getUser(),
  ]);

  return <Exchange initialRows={rows || []} signedIn={!!user} />;
}
