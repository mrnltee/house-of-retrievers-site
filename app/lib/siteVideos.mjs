/**
 * The site's background videos, hosted on Cloudinary (cloud "dgelskqx", folder
 * site-videos) instead of public/, so every Vercel deployment isn't carrying
 * ~15 MB of video. They are the original H.264 MP4 files, delivered untouched
 * (no transformation, so no Cloudinary processing credits). Posters stay in
 * public/ and show if a video can't load. To replace a video, upload the new
 * file in Cloudinary → Media Library → site-videos with the same Public ID.
 */
const BASE = "https://res.cloudinary.com/dgelskqx/video/upload";

export const SITE_VIDEOS = {
  hero: `${BASE}/hero-1080p.mp4`,
  joinUs: `${BASE}/cta-join-us.mp4`,
  giveBack: `${BASE}/mby-give-back.mp4`,
};
