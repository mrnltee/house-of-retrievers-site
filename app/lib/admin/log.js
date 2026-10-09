import { sql } from "../db";

/** Appends one line to the activity log. Never updates or deletes. */
export async function logActivity(actorEmail, action, target = null, details = {}, run = sql) {
  await run(
    "INSERT INTO activity_log (actor_email, action, target, details) VALUES ($1, $2, $3, $4)",
    [actorEmail, action, target, JSON.stringify(details)],
  );
}
