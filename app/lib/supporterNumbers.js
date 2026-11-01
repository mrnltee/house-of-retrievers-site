import { transaction } from "./db";
import { supporterNumber } from "./supporters.mjs";

/**
 * Gives a brand its HOR number the first time it's needed: HOR-XXXX-YY-NNNN,
 * YY = the year they registered (the Join form if they came through it, else
 * when the record was made). Returns the number, or "" when it already had one.
 */
export function issueSupporterNumber(supporterId) {
  return transaction(async (tx) => {
    await tx.sql("SELECT pg_advisory_xact_lock(727011)");
    const [row] = await tx.sql(
      `WITH me AS (
         SELECT extract(year FROM coalesce(p.created_at, s.created_at) AT TIME ZONE 'Asia/Manila')::smallint AS y
           FROM supporters s LEFT JOIN people p ON p.id = s.person_id WHERE s.id = $1)
       UPDATE supporters SET number_year = (SELECT y FROM me),
         number_no = (SELECT coalesce(max(number_no), 0) + 1 FROM supporters WHERE number_year = (SELECT y FROM me))
       WHERE id = $1 AND number_no IS NULL RETURNING code, number_year, number_no`,
      [supporterId],
    );
    return row ? supporterNumber(row) : "";
  });
}
