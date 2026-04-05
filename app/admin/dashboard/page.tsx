import { requireRole } from "@/lib/auth";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const adminLinks = [
  {
    title: "Classes",
    description: "Manage classes, streams, and class progression.",
    href: "/admin/classes",
  },
  {
    title: "Subjects",
    description: "Create and manage school-wide subjects and class-subject mappings.",
    href: "/admin/subjects",
  },
  {
    title: "Academic Years",
    description: "Configure academic years and their terms.",
    href: "/admin/academicyears",
  },
  {
    title: "Students",
    description: "Create, update, bulk upload, and manage student lifecycle actions.",
    href: "/admin/students",
  },
  {
    title: "Teachers",
    description: "Manage teacher accounts, stream-subject assignments, and class teachers.",
    href: "/admin/teachers",
  },
  {
    title: "Exams",
    description: "Create exams and configure subject combinations by class.",
    href: "/admin/exams",
  },
  {
    title: "Merit Lists",
    description: "Generate rankings, champions, and printable exports per class and exam.",
    href: "/admin/merit-lists",
  },
  {
    title: "Reports",
    description: "Publish reports, edit remarks, and reopen report cycles.",
    href: "/admin/reports",
  },
];

export default async function AdminDashboardPage() {
  const session = await requireRole("ADMIN");

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-6xl space-y-8">
        <Card className="overflow-hidden border-slate-200 bg-white/90">
          <CardHeader className="bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_55%)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Admin Dashboard</p>
            <CardTitle className="text-3xl md:text-4xl">School operations control</CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Signed in as {session.user.email}. Use these entry points to manage the exam workflow from setup through
              reporting.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <ButtonLink href="/">Home</ButtonLink>
            <ButtonLink href="/api/auth/signout" variant="outline">
              Sign out
            </ButtonLink>
          </CardContent>
        </Card>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {adminLinks.map((item) => (
            <Card key={item.title} className="border-slate-200 bg-white/95">
              <CardHeader>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Module</p>
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
