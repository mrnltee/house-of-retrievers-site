-- The organization's name is written "The House of Retrievers’ Society, Inc."
-- everywhere (owner, 2026-11-12), not "The House of Retrievers Society Inc.".
-- The code was changed; this fixes wording HOR saved in the admin (media hub,
-- journey stops, email templates, letters and their saved answers; payment details are
-- left alone, since they change only through the two-Owner review). Case-sensitive, so the capitalised letter signature is untouched.
-- Rows already correct are left alone. Safe to run again.
DO $$
DECLARE
  col record;
  pat constant text := 'House of Retrievers[’'']? Society,? Inc\.?';
  fix constant text := 'House of Retrievers’ Society, Inc.';
BEGIN
  FOR col IN
    SELECT table_name, column_name, data_type FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('media_hub_documents', 'journey_entries', 'email_templates',
                         'custom_email_templates', 'letter_templates', 'letter_saved_values')
      AND data_type IN ('text', 'character varying', 'jsonb')
  LOOP
    IF col.data_type = 'jsonb' THEN
      EXECUTE format(
        'UPDATE %I SET %I = regexp_replace(%I::text, %L, %L, ''g'')::jsonb WHERE %I::text ~ %L AND regexp_replace(%I::text, %L, %L, ''g'') <> %I::text',
        col.table_name, col.column_name, col.column_name, pat, fix,
        col.column_name, pat, col.column_name, pat, fix, col.column_name);
    ELSE
      EXECUTE format(
        'UPDATE %I SET %I = regexp_replace(%I, %L, %L, ''g'') WHERE %I ~ %L AND regexp_replace(%I, %L, %L, ''g'') <> %I',
        col.table_name, col.column_name, col.column_name, pat, fix,
        col.column_name, pat, col.column_name, pat, fix, col.column_name);
    END IF;
  END LOOP;
END $$;
