"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInButtons({ google, dev, callbackUrl, reauth }) {
  const [email, setEmail] = useState("");
  return (
    <div className="form" style={{ width: "100%" }}>
      {google && (
        <button
          type="button"
          className="btn"
          // max_age=0 asks Google to confirm the account again rather than reuse a silent session.
          onClick={() => signIn("google", { callbackUrl }, reauth ? { prompt: "select_account", max_age: "0" } : undefined)}
        >
          Sign in with Google
        </button>
      )}
      {!google && !dev && <p className="banner note small">Google sign-in isn&apos;t set up yet.</p>}
      {dev && (
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            signIn("dev", { email, callbackUrl });
          }}
        >
          <label className="field">
            <span>Local test login (development only)</span>
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <button className="btn ghost" type="submit">Sign in for testing</button>
        </form>
      )}
    </div>
  );
}
