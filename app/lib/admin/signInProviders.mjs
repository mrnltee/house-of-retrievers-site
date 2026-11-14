/**
 * Admin sign-in providers besides Google (owner, 2026-11-15). Pure, so they
 * can be tested. Yahoo signs in through OpenID Connect: an app made at
 * developer.yahoo.com with the OpenID Connect "Email" and "Profile"
 * permissions, its keys in Vercel as YAHOO_CLIENT_ID / YAHOO_CLIENT_SECRET
 * (server-only), and the redirect URI <admin URL>/api/auth/callback/yahoo.
 * Without both keys there's no Yahoo button. Who gets in is still decided by
 * the admin list, exactly as for Google.
 */
export function yahooProvider(env = process.env) {
  if (!env.YAHOO_CLIENT_ID || !env.YAHOO_CLIENT_SECRET) return null;
  return {
    id: "yahoo",
    name: "Yahoo",
    type: "oauth",
    wellKnown: "https://api.login.yahoo.com/.well-known/openid-configuration",
    authorization: { params: { scope: "openid email profile" } },
    idToken: true,
    // Yahoo signs its ID token with ES256; openid-client assumes RS256 and refuses
    // the callback ("unexpected JWT alg received") unless the client says so.
    client: { id_token_signed_response_alg: "ES256" },
    checks: ["state", "nonce"],
    clientId: env.YAHOO_CLIENT_ID,
    clientSecret: env.YAHOO_CLIENT_SECRET,
    profile(profile) {
      return {
        id: profile.sub,
        email: String(profile.email || "").toLowerCase(),
        name: profile.name || profile.nickname || null,
        image: profile.picture || null,
      };
    },
  };
}

/**
 * Google and Yahoo must say the account's email is verified (a real `true`);
 * a missing claim refuses the sign-in. The local test login isn't checked.
 */
export function verifiedEmail(provider, profile) {
  if (provider === "google" || provider === "yahoo") return profile?.email_verified === true;
  return true;
}

/**
 * The sign-in choices in words for admin copy ("Google or Yahoo"), so invite
 * and re-sign-in wording never says Google only once Yahoo is switched on.
 */
export function providerNames({ google = false, yahoo = false } = {}) {
  const names = [google && "Google", yahoo && "Yahoo"].filter(Boolean);
  return names.length ? names.join(" or ") : "Google";
}
