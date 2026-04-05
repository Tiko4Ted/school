import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export default async function HomePage() {
  const session = await requireAuth();
  const dashboardHref = session.user.role === "ADMIN" ? "/admin/dashboard" : "/teacher/dashboard";

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 dark:bg-background-dark">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,var(--color-primary-light),transparent_50%),radial-gradient(ellipse_at_bottom_left,var(--color-secondary-light),transparent_50%)] opacity-40"></div>
      
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">SchoolMS</p>
          <CardTitle className="text-4xl font-extrabold tracking-tight">Access Granted</CardTitle>
          <CardDescription className="text-lg leading-relaxed">
            Welcome back. You are successfully authenticated to the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="rounded-2xl border border-border-subtle bg-background/50 p-6 dark:border-border-dark dark:bg-background-dark/50">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider">Account Identity</p>
                <p className="text-lg font-bold text-text-primary dark:text-text-primary-dark">{session.user.email}</p>
              </div>
              <div className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-soft">
                {session.user.role} ACCESS
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <ButtonLink href={dashboardHref} variant="primary">
              Launch Portal Dashboard
            </ButtonLink>
            <ButtonLink href="/api/auth/signout" variant="outline">
              Sign Out Securely
            </ButtonLink>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
