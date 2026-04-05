import { requireRole } from "@/lib/auth";
import { SubjectForm } from "@/components/admin/subject-form";

export default async function NewSubjectPage() {
  await requireRole("ADMIN");

  return (
    <SubjectForm
      mode="create"
      title="Create subject"
      description="Add a school-wide subject for class mapping and exams."
      submitLabel="Create subject"
      initialValues={{ name: "", code: "" }}
    />
  );
}
