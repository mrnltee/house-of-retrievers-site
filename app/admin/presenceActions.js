"use server";

import { currentAdmin } from "../lib/admin/auth";

/** Heartbeat from an open admin tab, so it counts as online (currentAdmin marks it). */
export async function stillHere() {
  await currentAdmin();
}
