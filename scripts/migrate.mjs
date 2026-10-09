// Applies db/migrations/*.sql in name order, once each.
//   DATABASE_URL=... node scripts/migrate.mjs
// Each file runs in its own transaction and is recorded in schema_migrations.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");

export async function migrate(connectionString) {
  const client = new pg.Client({ connectionString, ssl: sslFor(connectionString) });
  await client.connect();
  try {
    // Two deployments building at once must not both apply the same file.
    await client.query("SELECT pg_advisory_lock(727001)");
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    const done = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    const applied = [];
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(path.join(dir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        applied.push(file);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`${file}: ${error.message}`);
      }
    }
    return applied;
  } finally {
    await client.end();
  }
}

function sslFor(url) {
  return /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: true };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Neon's pooled URL can't hold a session lock; use the direct one when Vercel provides it.
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    // The build runs this with --if-configured, so a deployment without a
    // database (or a fresh clone) still builds.
    if (process.argv.includes("--if-configured")) {
      console.log("No DATABASE_URL: skipping migrations.");
      process.exit(0);
    }
    console.error("Set DATABASE_URL first (npx vercel env pull .env.local, then source it).");
    process.exit(1);
  }
  const applied = await migrate(url);
  console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Already up to date.");
}
