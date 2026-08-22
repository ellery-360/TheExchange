import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE = "exchange_steward";

/* Server-only. Never prefixed NEXT_PUBLIC_, so it is never sent to a browser. */
const PASSCODE = process.env.ENTRY_PASSCODE;

function token() {
  return crypto
    .createHmac("sha256", PASSCODE || "unset")
    .update("the-exchange-steward-v1")
    .digest("hex");
}

export function checkPasscode(input) {
  if (!PASSCODE) return false;
  const a = Buffer.from(String(input || ""));
  const b = Buffer.from(PASSCODE);
  // constant time, and length-safe
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function grant() {
  cookies().set(COOKIE, token(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180, // a season
  });
}

export function revoke() {
  cookies().delete(COOKIE);
}

export function isSteward() {
  if (!PASSCODE) return false;
  return cookies().get(COOKIE)?.value === token();
}
