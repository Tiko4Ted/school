import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const session = await getAuthSession();

  if (session?.user) {
    redirect("/");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "linear-gradient(135deg, rgba(215, 226, 255, 0.9), rgba(244, 246, 251, 1) 50%, rgba(229, 238, 255, 0.9))",
      }}
    >
      <LoginForm />
    </main>
  );
}
