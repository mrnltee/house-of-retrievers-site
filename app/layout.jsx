import "./globals.css";

export const metadata = {
  title: "House of Retrievers PH - Good Dogs. Good People. Greater Good.",
  description:
    "A Philippine nonprofit of retriever families raising their dogs well and bringing them along to help people and animals who need it. Volunteers welcome, with or without a dog.",
};

export const viewport = {
  themeColor: "#0d0d0d",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
