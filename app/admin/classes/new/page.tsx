import { requireRole } from "@/lib/auth";
import { listClasses } from "@/lib/services/setup";
import { ClassForm } from "@/components/admin/class-form";

export default async function NewClassPage() {
  await requireRole("ADMIN");
  const classOptions = await listClasses();

  return (
    <ClassForm
      mode="create"
      title="Create class"
      description="Add a class and define whether it supports streams."
      submitLabel="Create class"
      initialValues={{ name: "", level: 1, hasStreams: true, nextClassId: null }}
      classOptions={classOptions.map((item) => ({ id: item.id, name: item.name, level: item.level }))}
    />
  );
}
