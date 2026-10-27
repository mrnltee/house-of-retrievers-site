-- Team chat edit / delete (owner, 2026-10-27). People edit or delete their own
-- messages; others see "(edited)" or "Message deleted". Owners can still read
-- every earlier version and deleted messages, so nothing is lost.
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE TABLE IF NOT EXISTS chat_message_versions (
  id bigserial PRIMARY KEY,
  message_id bigint NOT NULL REFERENCES chat_messages(id),
  body text NOT NULL,
  replaced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_message_versions_message ON chat_message_versions (message_id);
