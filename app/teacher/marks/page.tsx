import { requireRole } from "@/lib/auth";
import { TeacherMarksEntry } from "@/components/teacher/marks-entry";

export default async function TeacherMarksPage() {
  await requireRole("TEACHER");
  return <TeacherMarksEntry />;
}
