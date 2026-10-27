-- Team chat (owner, 2026-10-27): one room for all admins. Messages older
-- than 90 days show under Archive instead of the room; nothing is deleted.
CREATE TABLE IF NOT EXISTS chat_messages (
  id bigserial PRIMARY KEY,
  author_email text NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_created_at ON chat_messages (created_at);
-- Up to which message each admin has read, for the sidebar's unread badge.
ALTER TABLE admins ADD COLUMN IF NOT EXISTS chat_read_id bigint NOT NULL DEFAULT 0;
