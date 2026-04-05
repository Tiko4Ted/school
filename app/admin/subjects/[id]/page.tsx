import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { SubjectForm } from "@/components/admin/subject-form";
import { getSubjectById } from "@/lib/services/setup";

type Params = {
  params: {
    id: string;
  };
};

export default async function EditSubjectPage({ params }: Params) {
  await requireRole("ADMIN");
  const subject = await getSubjectById(params.id);

  if (!subject) {
    notFound();
  }

  return (
    <SubjectForm
      mode="edit"
      subjectId={subject.id}
      title="Edit subject"
      description="Update the subject name and code."
      submitLabel="Save changes"
      initialValues={{ name: subject.name, code: subject.code }}
    />
  );
}
