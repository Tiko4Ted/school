import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { StreamForm } from "@/components/admin/stream-form";
import { getClassById } from "@/lib/services/setup";

type Params = {
  params: {
    classId: string;
  };
};

export default async function NewStreamPage({ params }: Params) {
  await requireRole("ADMIN");
  const schoolClass = await getClassById(params.classId);

  if (!schoolClass) {
    notFound();
  }

  return (
    <StreamForm
      mode="create"
      classId={schoolClass.id}
      className={schoolClass.name}
      title="Add stream"
      description="Create a new stream for this class."
      submitLabel="Create stream"
      initialValues={{ name: "", isDefault: false }}
    />
  );
}
