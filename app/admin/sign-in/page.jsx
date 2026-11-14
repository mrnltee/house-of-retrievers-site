import { redirect } from "next/navigation";
import { hasDatabase } from "../../lib/db";
import { currentAdmin, devLoginEnabled, yahooReady } from "../../lib/admin/auth";
import { adminHref } from "../../lib/admin/guard";
import SignInButtons from "./SignInButtons";

const ERRORS = {
  AccessDenied: "That account isn't on the admin list, or its email isn't verified. Ask an Owner to invite the email you signed in with.",
  Callback: "Sign-in didn't finish. Try again.",
  OAuthSignin: "Sign-in didn't start. Try again.",
  Default: "Sign-in didn't work. Try again.",
};

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;
  const ready = hasDatabase();
  if (ready && (await currentAdmin()) && !params?.reauth) redirect(await adminHref("/"));
  const googleReady = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const error = params?.error ? ERRORS[params.error] || ERRORS.Default : null;
  const callbackUrl = typeof params?.next === "string" && params.next.startsWith("/") ? params.next : await adminHref("/");

  return (
    <main className="admin-signin">
      <div className="card">
        <img src="/house-of-retrievers-logo-original.png" alt="The House of Retrievers’ Society, Inc. — Paws for a Purpose" width="1396" height="564" />
        <h1>Admin</h1>
        <p className="muted">
          {params?.reauth ? "Sign in again to approve payment details." : "For HOR volunteers who run events, sign-ups and donations."}
        </p>
        {error && <p role="alert" className="banner alert small">{error}</p>}
        {!ready ? (
          <p className="banner note small">The admin isn&apos;t switched on yet: its database and sign-in settings are still being added.</p>
        ) : (
          <SignInButtons google={googleReady} yahoo={yahooReady} dev={devLoginEnabled} callbackUrl={callbackUrl} reauth={Boolean(params?.reauth)} />
        )}
        <p className="small muted">Only the email an Owner invited can sign in, with Google{yahooReady ? " or Yahoo" : ""}. Please keep 2-step verification on for that account.</p>
      </div>
    </main>
  );
}
