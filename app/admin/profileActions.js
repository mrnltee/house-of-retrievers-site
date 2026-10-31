"use server";

import { revalidatePath } from "next/cache";
import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { pictureFrom } from "../lib/admin/imageUpload";
import { cleanProfile } from "../lib/admin/profile.mjs";

const form = (data, key) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};

/** My profile: anyone signed in edits their own name, furbaby, photo and how their name shows. */
export async function saveMyProfile(data) {
  try {
    const admin = await actionAdmin();
    const { profile: p, error } = cleanProfile({ name: form(data, "name"), firstName: form(data, "firstName"), furbabyName: form(data, "furbabyName"), showAs: form(data, "showAs") });
    if (error) await backWith("/profile", "error", error);
    const photo = await pictureFrom(data, "photo", admin.email);
    if (photo.error) await backWith("/profile", "error", photo.error);
    await sql("UPDATE admins SET name=$2, first_name=$3, furbaby_name=$4, show_as=$5, photo=$6 WHERE email=$1 AND active", [admin.email, p.name, p.firstName, p.furbabyName, p.showAs, photo.url]);
    await logActivity(admin.email, "admin.profile", admin.email, {});
    // The sidebar (in the shared layout) shows the name and photo, so redraw it too.
    revalidatePath("/", "layout");
    await backWith("/profile", "ok", "Profile saved.");
  } catch (error) {
    if (error instanceof Forbidden) await backWith("/profile", "error", error.message);
    throw error;
  }
}
