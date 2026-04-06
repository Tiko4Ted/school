import { requireRole } from "@/lib/auth";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";

const adminModules = [
  {
    title: "Students",
    description: "Enrollment & directory",
    href: "/admin/students",
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    color: "bg-primary-light text-primary",
  },
  {
    title: "Teachers",
    description: "Staff & assignments",
    href: "/admin/teachers",
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>,
    color: "bg-secondary-light text-secondary",
  },
  {
    title: "Classes",
    description: "Levels & streams",
    href: "/admin/classes",
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
    color: "bg-accent-light text-accent",
  },
  {
    title: "Exams",
    description: "Assessment cycles",
    href: "/admin/exams",
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    color: "bg-primary-light text-primary",
  },
  {
    title: "Merit Lists",
    description: "Rankings & performance",
    href: "/admin/merit-lists",
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-2.06 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946 2.06 3.42 3.42 0 010 4.606 3.42 3.42 0 00-1.946 2.06 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-2.06 3.42 3.42 0 010-4.606z" /></svg>,
    color: "bg-secondary-light text-secondary",
  },
  {
    title: "Reports",
    description: "Official report cards",
    href: "/admin/reports",
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>,
    color: "bg-accent-light text-accent",
  },
  {
    title: "Subjects",
    description: "Departmental subjects",
    href: "/admin/subjects",
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
    color: "bg-primary-light text-primary",
  },
  {
    title: "Calendar",
    description: "Academic years & terms",
    href: "/admin/academicyears",
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    color: "bg-secondary-light text-secondary",
  },
];

export default async function AdminDashboardPage() {
  const session = await requireRole("ADMIN");

  const [studentCount, teacherCount, classCount, examCount] = await Promise.all([
    db.student.count({ where: { status: "ACTIVE" } }),
    db.teacher.count(),
    db.class.count(),
    db.exam.count(),
  ]);

  return (
    <main className="space-y-10 pb-20">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary dark:text-text-primary-dark">Institutional Dashboard</h1>
          <p className="text-sm font-bold text-text-secondary uppercase tracking-[0.2em]">Signed in as {session.user.email}</p>
        </div>
        <div className="flex gap-3">
          <ButtonLink href="/" variant="outline" className="h-10 px-6 font-black uppercase text-[10px]">Back Home</ButtonLink>
          <ButtonLink href="/api/auth/signout" variant="primary" className="h-10 px-6 font-black uppercase text-[10px]">Sign out</ButtonLink>
        </div>
      </div>

      {/* High-Level Analytics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-soft bg-primary text-white">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Active Students</p>
            <p className="mt-1 text-3xl font-black">{studentCount}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-soft">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Total Faculty</p>
            <p className="mt-1 text-3xl font-black text-secondary">{teacherCount}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-soft">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Academic Levels</p>
            <p className="mt-1 text-3xl font-black text-accent">{classCount}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-soft">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Total Assessments</p>
            <p className="mt-1 text-3xl font-black text-text-primary">{examCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Module Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {adminModules.map((mod) => (
          <Card key={mod.title} className="border-none shadow-soft group hover:ring-2 hover:ring-primary/20 transition-all duration-300">
            <CardContent className="p-0">
              <ButtonLink href={mod.href} variant="ghost" className="w-full flex flex-col items-center justify-center p-8 h-full bg-transparent hover:bg-transparent">
                <div className={`mb-4 rounded-2xl p-4 ${mod.color} group-hover:scale-110 transition-transform duration-300 shadow-soft`}>
                  {mod.icon}
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-text-primary">{mod.title}</h3>
                <p className="mt-1 text-[10px] font-bold text-text-secondary/60 uppercase text-center leading-relaxed">
                  {mod.description}
                </p>
              </ButtonLink>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
