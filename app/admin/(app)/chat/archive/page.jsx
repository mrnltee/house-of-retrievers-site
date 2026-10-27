import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { CHAT_ROOM_DAYS } from "../../../../lib/admin/chat.mjs";
import { PageHead } from "../../ui";
import { shapeMessages } from "../../../../lib/admin/chatView";
import { ChatMessage } from "../TeamChat";

const MONTH = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "long", year: "numeric" });

/** Chat older than the room keeps, by month, read only. */
export default async function ChatArchive({ searchParams }) {
  const { admin } = await pageAdmin();
  const base = await adminBase();
  const params = await searchParams;
  const months = await sql(
    `SELECT to_char(created_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM') AS month, count(*)::int AS n FROM chat_messages
     WHERE created_at <= now() - interval '${CHAT_ROOM_DAYS} days' GROUP BY 1 ORDER BY 1 DESC`,
  );
  const pick = months.find((m) => m.month === params?.month)?.month || months[0]?.month;
  const rows = pick
    ? await sql(
        `SELECT m.id, m.author_email, coalesce(a.name, split_part(m.author_email, '@', 1)) AS author, m.body, m.created_at, m.edited_at, m.deleted_at FROM chat_messages m
         LEFT JOIN admins a ON a.email = m.author_email
         WHERE to_char(m.created_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM') = $1 AND m.created_at <= now() - interval '${CHAT_ROOM_DAYS} days'
         ORDER BY m.id`,
        [pick],
      )
    : [];
  const shown = await shapeMessages(rows, admin);
  return (
    <>
      <PageHead title="Archived chats" lead={`Team chat older than ${CHAT_ROOM_DAYS} days. Read only.`}>
        <a className="btn" href={`${base}/chat`}>Back to Team chat</a>
      </PageHead>
      {months.length === 0 ? (
        <p className="empty">Nothing archived yet.</p>
      ) : (
        <>
          <div className="actions">
            {months.map((m) => (
              <a key={m.month} className={`chip ${m.month === pick ? "dark" : ""}`} href={`${base}/chat/archive?month=${m.month}`}>
                {MONTH.format(new Date(`${m.month}-15T00:00:00+08:00`))} ({m.n})
              </a>
            ))}
          </div>
          <section className="card chat">
            <div className="chat-list">
              {shown.map((m) => <ChatMessage key={m.id} m={m} readOnly />)}
            </div>
          </section>
        </>
      )}
    </>
  );
}
