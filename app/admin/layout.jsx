import "./admin.css";

export const metadata = {
  title: "Admin | House of Retrievers PH",
  robots: { index: false, follow: false },
};

// Every admin page reads the database and the signed-in user.
export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }) {
  return <div className="admin">{children}</div>;
}
