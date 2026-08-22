import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/* Bypasses row level security. Only ever imported by server actions that
 * have already checked the passcode. Never reaches the browser. */
const SECRET =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export function admin() {
  if (!SECRET) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createClient(SUPABASE_URL, SECRET, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
