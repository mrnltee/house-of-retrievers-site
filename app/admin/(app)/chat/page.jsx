import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { CHAT_ROOM_DAYS } from "../../../lib/admin/chat.mjs";
import { PageHead } from "../ui";
import TeamChat from "./TeamChat";

/** Team chat (owner, 2026-10-27): one room for every admin. */
export default async function ChatPage() {
  const { admin } = await pageAdmin();
  const base = await adminBase();
  return (
    <div className="chat-page">
      <PageHead title="Team chat" lead={`One room for everyone in the admin. Messages older than ${CHAT_ROOM_DAYS} days move to the archive.`}>
        <a className="btn" href={`${base}/chat/archive`}>Archived chats</a>
      </PageHead>
      <TeamChat preview={Boolean(admin.preview)} />
      <p className="small muted">Everyone in the admin can read this room. Keep people&apos;s personal details (phone numbers, payments) out of chat.</p>
    </div>
  );
}
