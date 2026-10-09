import "./globals.css";
import Script from "next/script";
import {
  HOME_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  structuredData,
} from "./lib/siteSeo.mjs";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: HOME_URL,
  },
  openGraph: {
    type: "website",
    url: HOME_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "en_PH",
    images: [
      {
        url: "/house-of-retrievers-hero-poster.jpg",
        width: 1280,
        height: 720,
        alt: "House of Retrievers furparents and furbabies together",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/house-of-retrievers-hero-poster.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: "mdp09wptJveFFdLSADCxnY7kXz-_1oPI7ggmejURnz4",
  },
};

export const viewport = {
  themeColor: "#0d0d0d",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap"
        />
      </head>
      <body>{children}</body>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-MNCGQGDRPR"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-MNCGQGDRPR');`}
      </Script>
    </html>
  );
}
