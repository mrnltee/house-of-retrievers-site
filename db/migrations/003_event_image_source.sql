-- Keep the uncropped upload and the framing used, so "Adjust framing" can
-- re-crop from the full photo instead of zooming into the saved crop.
-- image_crop: {"zoom": 1-4, "x": 0-1, "y": 0-1}, the crop centre as a share of the source size.
ALTER TABLE events ADD COLUMN image_source text;
ALTER TABLE events ADD COLUMN image_crop jsonb;
