import { requireRole } from "@/lib/auth";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const teacherLinks = [
  {
    title: "Marks Entry",
    description: "Work only within your assigned stream-subject combinations and exam configurations.",
    href: "/teacher/marks",
  },
];

export default async function TeacherDashboardPage() {
  const session = await requireRole("TEACHER");

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ecfeff_0%,#f8fafc_42%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-5xl space-y-8">
        <Card className="overflow-hidden border-cyan-100 bg-white/90">
          <CardHeader className="bg-[radial-gradient(circle_at_top_left,#cffafe,transparent_55%)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Teacher Dashboard</p>
            <CardTitle className="text-3xl md:text-4xl">Marks and performance tools</CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Signed in as {session.user.email}. These links keep teachers inside their permitted marks workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <ButtonLink href="/">Home</ButtonLink>
            <ButtonLink href="/api/auth/signout" variant="outline">
              Sign out
            </ButtonLink>
          </CardContent>
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          {teacherLinks.map((item) => (
            <Card key={item.title} className="border-cyan-100 bg-white/95">
              <CardHeader>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace</p>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ButtonLink href={item.href}>Open {item.title}</ButtonLink>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
