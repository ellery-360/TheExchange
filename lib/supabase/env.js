/* Supabase renamed its browser key: older projects issue an `anon` JWT,
 * newer ones issue `sb_publishable_...`. Both go in the same slot, so
 * accept whichever the project happens to have. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const configured = Boolean(SUPABASE_URL && SUPABASE_KEY);
