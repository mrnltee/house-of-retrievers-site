-- Social links (owner, 2026-11-01): Facebook, TikTok, X and Threads for brands
-- and beneficiaries, next to Instagram and the website. Stored as clean links. Additive.
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS facebook text CHECK (length(facebook) <= 300);
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS tiktok text CHECK (length(tiktok) <= 300);
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS x_profile text CHECK (length(x_profile) <= 300);
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS threads text CHECK (length(threads) <= 300);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS facebook text CHECK (length(facebook) <= 300);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS tiktok text CHECK (length(tiktok) <= 300);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS x_profile text CHECK (length(x_profile) <= 300);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS threads text CHECK (length(threads) <= 300);
