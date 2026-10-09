import pg from "pg";

/**
 * Postgres access for the admin module and the parts of the public site it
 * feeds. Neon (added through Vercel) sets DATABASE_URL. Until it exists the
 * public site keeps working from its built-in content: check `hasDatabase()`
 * before calling `sql`.
 */

// Keep DATE columns as "YYYY-MM-DD" strings. Parsed into a JS Date they land
// at local midnight, and turning them back into a day shifts them by the
// server's UTC offset.
pg.types.setTypeParser(1082, (value) => value);

let pool;

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    const local = /localhost|127\.0\.0\.1/.test(connectionString);
    pool = new pg.Pool({
      connectionString,
      ssl: local ? false : { rejectUnauthorized: true },
      // Serverless functions each hold a small pool; Neon's pooled URL fans these in.
      max: 3,
      idleTimeoutMillis: 10_000,
    });
  }
  return pool;
}

/** Parameterised query. Returns the rows. */
export async function sql(text, params = []) {
  const result = await getPool().query(text, params);
  return result.rows;
}

/** Runs `work(client)` inside one transaction. */
export async function transaction(work) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const value = await work({
      sql: async (text, params = []) => (await client.query(text, params)).rows,
    });
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
