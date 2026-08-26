import "./globals.css";

export const metadata = {
  title: "House of Retrievers — Good Dogs. Good People. Greater Good.",
  description:
    "A community of responsible retriever families turning companionship into meaningful service.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
