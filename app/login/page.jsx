"use client";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { signIn } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Checking…" : "Enter"}
    </button>
  );
}

export default function Login() {
  const [state, action] = useFormState(signIn, {});
  return (
    <div className="empty">
      <h1 className="black">The Counting House</h1>
      <p className="sub">Stewards only</p>
      <form action={action}>
        <input
          className="field" type="password" name="passcode" placeholder="Passcode"
          autoComplete="current-password" autoFocus
        />
        <Submit />
      </form>
      {state?.error && <p className="msg bad">{state.error}</p>}
      <p className="back"><Link href="/">← Back to the bourse</Link></p>
    </div>
  );
}
