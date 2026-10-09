import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth/next";
import { hasDatabase, sql } from "../db";
import { parseEmailList } from "./roles.mjs";

/**
 * Admin sign-in. Only Google accounts that an Owner invited (rows in `admins`)
 * or that are listed in ADMIN_OWNER_EMAILS can get in. Sessions are signed
 * cookies (NEXTAUTH_SECRET); roles are read from the database on every
 * request, never trusted from the cookie.
 */

const ownerEmails = () => parseEmailList(process.env.ADMIN_OWNER_EMAILS);

/**
 * Local testing only: sign in by typing an invited email, no Google. Needs
 * ADMIN_DEV_LOGIN=1 and a development build, so it can never run on Vercel.
 */
export const devLoginEnabled =
  process.env.ADMIN_DEV_LOGIN === "1" && process.env.NODE_ENV === "development" && !process.env.VERCEL;

async function allowAndRecord(rawEmail, name) {
  const email = String(rawEmail || "").toLowerCase();
  if (!email || !hasDatabase()) return false;
  if (ownerEmails().includes(email)) {
    // Owners named in the environment always get in and always hold the Owner role,
    // so the first Owner can never be locked out by a mistaken edit.
    await sql(
      `INSERT INTO admins (email, name, roles, active, invited_by, last_seen_at)
       VALUES ($1, $2, '{owner}', true, 'ADMIN_OWNER_EMAILS', now())
       ON CONFLICT (email) DO UPDATE SET
         roles = CASE WHEN 'owner' = ANY(admins.roles) THEN admins.roles ELSE array_prepend('owner', admins.roles) END,
         active = true, name = COALESCE(admins.name, EXCLUDED.name), last_seen_at = now()`,
      [email, name || null],
    );
    return true;
  }
  const rows = await sql(
    "UPDATE admins SET last_seen_at = now(), name = COALESCE(name, $2) WHERE email = $1 AND active RETURNING email",
    [email, name || null],
  );
  return rows.length > 0;
}

const providers = [];
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { prompt: "select_account" } },
    }),
  );
}
if (devLoginEnabled) {
  providers.push(
    CredentialsProvider({
      id: "dev",
      name: "Local test login",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(credentials) {
        const email = String(credentials?.email || "").toLowerCase();
        return email ? { id: email, email, name: email.split("@")[0] } : null;
      },
    }),
  );
}

export const authOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/admin/sign-in", error: "/admin/sign-in" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile?.email_verified !== true) return false;
      return allowAndRecord(user?.email, user?.name);
    },
    async jwt({ token, account }) {
      // A new sign-in (account is set only then) restarts the clock that
      // payment approvals check.
      if (account) token.authTime = Date.now();
      return token;
    },
    async session({ session, token }) {
      session.authTime = token.authTime;
      return session;
    },
  },
};

/**
 * The signed-in admin, freshly read from the database, or null.
 * @returns {Promise<null | {email: string, name: string|null, roles: string[], authTime: number}>}
 */
export async function currentAdmin() {
  if (!hasDatabase()) return null;
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;
  const rows = await sql("SELECT email, name, roles FROM admins WHERE email = $1 AND active", [email]);
  if (!rows.length) return null;
  return { ...rows[0], authTime: session.authTime };
}
