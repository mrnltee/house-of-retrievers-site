-- Media hub Activity history (23 Nov 2026, owner): each card shows a photo from
-- its own event, and the free hugs events are listed.
--
-- The published timeline had been saved with the home page's cover images
-- (a surf photo on the Milagros visit, the hero on the pack walk). Cards that
-- name a known activity get that activity's own photo; other cards are left
-- alone. When no card mentions free hugs, International Free Hugs Day goes in
-- after Pawres de Mayo and Monthly Free Hugs at the end. Saved wording is kept.
DO $$
DECLARE
  doc jsonb;
  rows jsonb;
  fixed jsonb := '[]'::jsonb;
  item jsonb;
  label text;
  photo text;
  ifhd jsonb := '{"activity":"International Free Hugs Day","date":"July 2026","location":"BGC, Taguig","purpose":"Where Purpose to Care began","thumbnail":"/journey/international-free-hugs-day/1.jpg"}';
  monthly jsonb := '{"activity":"Monthly Free Hugs","date":"Last Sunday of every month","location":"BGC, Taguig","purpose":"Free hugs from our furbabies, every month since September 2026","thumbnail":"/journey/freehugs-bgc/3.jpg"}';
  has_hugs boolean := false;
  placed boolean := false;
BEGIN
  SELECT content INTO doc FROM media_hub_documents WHERE id = true;
  IF doc IS NULL OR jsonb_typeof(doc->'timeline') IS DISTINCT FROM 'array' THEN
    RETURN;
  END IF;
  rows := doc->'timeline';

  FOR item IN SELECT value FROM jsonb_array_elements(rows) LOOP
    label := lower(coalesce(item->>'activity', '') || ' ' || coalesce(item->>'location', '') || ' ' || coalesce(item->>'purpose', ''));
    photo := CASE
      WHEN label LIKE '%pawres%' THEN '/journey/pawres-de-mayo/2.jpg'
      WHEN label LIKE '%milagros%' THEN '/journey/milagros-elderly-shelter/4.jpg'
      WHEN label LIKE '%beagle%' OR label LIKE '%pack walk%' THEN '/journey/beagle-buddies-pack-walk/3.jpg'
      WHEN label LIKE '%embroidery%' THEN '/2-better/better3.jpg'
      WHEN label LIKE '%international free hugs%' THEN '/journey/international-free-hugs-day/1.jpg'
      WHEN label LIKE '%hugs%' THEN '/journey/freehugs-bgc/3.jpg'
      ELSE NULL
    END;
    IF label LIKE '%hugs%' THEN has_hugs := true; END IF;
    IF photo IS NOT NULL THEN item := jsonb_set(item, '{thumbnail}', to_jsonb(photo)); END IF;
    fixed := fixed || jsonb_build_array(item);
  END LOOP;

  IF NOT has_hugs THEN
    rows := fixed;
    fixed := '[]'::jsonb;
    FOR item IN SELECT value FROM jsonb_array_elements(rows) LOOP
      fixed := fixed || jsonb_build_array(item);
      IF NOT placed AND lower(coalesce(item->>'activity', '')) LIKE '%pawres%' THEN
        fixed := fixed || jsonb_build_array(ifhd);
        placed := true;
      END IF;
    END LOOP;
    IF NOT placed THEN fixed := jsonb_build_array(ifhd) || fixed; END IF;
    fixed := fixed || jsonb_build_array(monthly);
  END IF;

  IF fixed IS DISTINCT FROM doc->'timeline' THEN
    UPDATE media_hub_documents SET content = jsonb_set(content, '{timeline}', fixed) WHERE id = true;
  END IF;
END $$;
