import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const session = await getAuthSession();

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 dark:bg-background-dark">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,var(--color-primary-light),transparent_50%),radial-gradient(ellipse_at_bottom_left,var(--color-secondary-light),transparent_50%)] opacity-40"></div>
      <LoginForm />
    </main>
  );
}
