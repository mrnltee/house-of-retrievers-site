-- "Our journey" homepage timeline: whether it's shown, and its layout.
CREATE TABLE IF NOT EXISTS journey_settings (
  id          boolean PRIMARY KEY DEFAULT true CHECK (id),
  show        boolean NOT NULL DEFAULT true,
  orientation text NOT NULL DEFAULT 'vertical' CHECK (orientation IN ('vertical', 'horizontal')),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text
);

INSERT INTO journey_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
