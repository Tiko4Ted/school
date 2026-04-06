import { requireRole } from "@/lib/auth";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";

const teacherModules = [
  {
    title: "Marks Entry",
    description: "Enter student assessments",
    href: "/teacher/marks",
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
    color: "bg-secondary-light text-secondary",
  },
];

export default async function TeacherDashboardPage() {
  const session = await requireRole("TEACHER");

  const teacher = await db.teacher.findUnique({
    where: { userId: session.user.id },
    include: {
      streamSubjectAssignments: true,
      classTeacherAssignments: {
        where: { isActive: true },
        include: { stream: { include: { class: true } } }
      }
    }
  });

  const assignmentCount = teacher?.streamSubjectAssignments.length ?? 0;
  const isClassTeacher = (teacher?.classTeacherAssignments.length ?? 0) > 0;
  const classTeacherInfo = teacher?.classTeacherAssignments[0];

  return (
    <main className="space-y-10 pb-20">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary dark:text-text-primary-dark">Teacher Workspace</h1>
          <p className="text-sm font-bold text-text-secondary uppercase tracking-[0.2em]">Logged in as {teacher ? `${teacher.firstName} ${teacher.lastName}` : session.user.email}</p>
        </div>
        <div className="flex gap-3">
          <ButtonLink href="/" variant="outline" className="h-10 px-6 font-black uppercase text-[10px]">Back Home</ButtonLink>
          <ButtonLink href="/api/auth/signout" variant="primary" className="h-10 px-6 font-black uppercase text-[10px] bg-secondary hover:bg-secondary-dark border-none">Sign out</ButtonLink>
        </div>
      </div>

      {/* Teacher Analytics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-none shadow-soft bg-secondary text-white">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Assigned Scopes</p>
            <p className="mt-1 text-3xl font-black">{assignmentCount}</p>
            <p className="mt-2 text-[10px] font-medium text-white/40 uppercase">Stream + Subject combinations</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-soft">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Class Teacher Status</p>
            <div className="mt-1 flex items-center gap-3">
              <p className={`text-2xl font-black ${isClassTeacher ? 'text-primary' : 'text-text-secondary/20'}`}>
                {isClassTeacher ? 'Assigned' : 'None'}
              </p>
              {isClassTeacher && (
                <span className="rounded-lg bg-primary-light px-2 py-0.5 text-[10px] font-black text-primary uppercase">
                  {classTeacherInfo?.stream.class.name} {classTeacherInfo?.stream.name}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-soft">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Academic Year</p>
            <p className="mt-1 text-2xl font-black text-text-primary">2026</p>
            <p className="mt-2 text-[10px] font-medium text-text-secondary/40 uppercase">Term I - Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Module Grid */}
      <div className="flex flex-wrap gap-6">
        {teacherModules.map((mod) => (
          <Card key={mod.title} className="w-full sm:w-72 border-none shadow-soft group hover:ring-2 hover:ring-secondary/20 transition-all duration-300">
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
