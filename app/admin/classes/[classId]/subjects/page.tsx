import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { ClassSubjectsManager } from "@/components/admin/class-subjects-manager";
import { getClassById, listSubjects } from "@/lib/services/setup";

type Params = {
  params: {
    classId: string;
  };
};

export default async function ClassSubjectsPage({ params }: Params) {
  await requireRole("ADMIN");
  const [schoolClass, subjects] = await Promise.all([getClassById(params.classId), listSubjects()]);

  if (!schoolClass) {
    notFound();
  }

  return <ClassSubjectsManager classId={schoolClass.id} className={schoolClass.name} allSubjects={subjects} />;
}
