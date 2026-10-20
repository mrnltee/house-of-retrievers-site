CREATE TABLE IF NOT EXISTS media_hub_documents (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

INSERT INTO media_hub_documents (id, content, status)
VALUES (true, '{}'::jsonb, 'draft')
ON CONFLICT (id) DO NOTHING;
