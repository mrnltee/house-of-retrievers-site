-- How the cover shows on the event page: 'fit' (whole, on a blurred copy of
-- itself), 'fill' (the framed crop, filling the frame) or 'tile' (repeated).
-- Extra photos carry the same choice in their gallery entry ("fit" key).
ALTER TABLE events ADD COLUMN image_fit text NOT NULL DEFAULT 'fit' CHECK (image_fit IN ('fit', 'fill', 'tile'));
