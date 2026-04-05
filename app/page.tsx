import Link from "next/link";
import { requireAuth } from "@/lib/auth";

const cardStyle = {
  maxWidth: "720px",
  margin: "64px auto",
  background: "#ffffff",
  borderRadius: "16px",
  padding: "32px",
  boxShadow: "0 18px 45px rgba(21, 32, 51, 0.08)",
};

export default async function HomePage() {
  const session = await requireAuth();
  const dashboardHref = session.user.role === "ADMIN" ? "/admin" : "/teacher";

  return (
    <main style={{ padding: "24px" }}>
      <section style={cardStyle}>
        <p style={{ margin: 0, color: "#51607a", fontSize: "14px" }}>SchoolMS</p>
        <h1 style={{ margin: "12px 0 8px", fontSize: "32px" }}>Authenticated session</h1>
        <p style={{ margin: 0, color: "#42506a", lineHeight: 1.6 }}>
          Signed in as <strong>{session.user.email}</strong> with role{" "}
          <strong>{session.user.role}</strong>.
        </p>
        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <Link
            href={dashboardHref}
            style={{
              background: "#152033",
              color: "#ffffff",
              padding: "12px 18px",
              borderRadius: "10px",
            }}
          >
            Open dashboard
          </Link>
          <Link
            href="/api/auth/signout"
            style={{
              border: "1px solid #c7d0dd",
              padding: "12px 18px",
              borderRadius: "10px",
            }}
          >
            Sign out
          </Link>
        </div>
      </section>
    </main>
  );
}
