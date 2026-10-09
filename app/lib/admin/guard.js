import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminHost } from "../adminHost.mjs";
import { currentAdmin } from "./auth";
import { can } from "./roles.mjs";

/** "" on admin.houseofretrieversph.org, "/admin" on previews and localhost. */
export async function adminBase() {
  const host = (await headers()).get("host");
  return isAdminHost(host) ? "" : "/admin";
}

/** Path as the address bar shows it on this host. */
export async function adminHref(path = "/") {
  const base = await adminBase();
  return path === "/" ? base || "/" : `${base}${path}`;
}

export class Forbidden extends Error {}

/**
 * For pages: the signed-in admin with `capability`, or a redirect to sign-in.
 * An admin without the capability gets `null` so the page can say so plainly.
 */
export async function pageAdmin(capability) {
  const admin = await currentAdmin();
  if (!admin) redirect(await adminHref("/sign-in"));
  if (capability && !can(admin.roles, capability)) return { admin, allowed: false };
  return { admin, allowed: true };
}

/** For server actions: the admin, or throws. Never trusts anything from the form. */
export async function actionAdmin(capability) {
  const admin = await currentAdmin();
  if (!admin) throw new Forbidden("Please sign in again.");
  if (capability && !can(admin.roles, capability)) throw new Forbidden("Your role can't do that.");
  return admin;
}

/** Redirect back to `path` with a message the page shows. */
export async function backWith(path, kind, message) {
  const href = await adminHref(path);
  const join = href.includes("?") ? "&" : "?";
  redirect(`${href}${join}${kind}=${encodeURIComponent(message)}`);
}
