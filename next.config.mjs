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
  // Admin forms carry a resized event photo or a QR image (under ~2 MB).
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  async headers() {
    // The admin's event-day check-in scans QR codes with the phone camera.
    // Later rules win for the same header, so this only loosens the admin.
    const adminCamera = [{ key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" }];
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/(.*)",
        has: [{ type: "host", value: "admin.houseofretrieversph.org" }],
        headers: [...adminCamera, { key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      { source: "/admin/:path*", headers: adminCamera },
    ];
  },
};

export default nextConfig;
