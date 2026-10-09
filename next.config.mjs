/** @type {import('next').NextConfig} */
const securityHeaders = [
  // HTTPS only, for two years, on this domain and its subdomains (www, events).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The site is never meant to be shown inside another site's frame.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // The site uses none of these. File uploads still work: choosing a photo
  // from the camera goes through the file picker, not camera access.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
