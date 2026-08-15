"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");

  async function send() {
    if (!email.includes("@")) {
      setState("error");
      setMessage("That doesn't look like an email address.");
      return;
    }
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${
          process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
        }/auth/confirm?next=/enter`,
      },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else {
      setState("sent");
      setMessage("Check your email for a link. It opens the entry desk.");
    }
  }

  return (
    <div className="empty">
      <h1 className="black">The Counting House</h1>
      <p className="sub">Members only. Everyone else may watch the bourse.</p>
      <input
        className="field" type="email" placeholder="you@example.com" value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        autoComplete="email"
      />
      <button className="btn" onClick={send} disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send me a link"}
      </button>
      {message && <p className={state === "error" ? "msg bad" : "msg good"}>{message}</p>}
      <p className="back"><Link href="/">← Back to the bourse</Link></p>
    </div>
  );
}
