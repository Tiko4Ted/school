import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { ClassForm } from "@/components/admin/class-form";
import { getClassById, listClasses } from "@/lib/services/setup";

type Params = {
  params: {
    classId: string;
  };
};

export default async function EditClassPage({ params }: Params) {
  await requireRole("ADMIN");
  const [schoolClass, classOptions] = await Promise.all([getClassById(params.classId), listClasses()]);

  if (!schoolClass) {
    notFound();
  }

  return (
    <ClassForm
      mode="edit"
      classId={schoolClass.id}
      title="Edit class"
      description="Update the class name, level, stream configuration, and progression."
      submitLabel="Save changes"
      initialValues={{
        name: schoolClass.name,
        level: schoolClass.level,
        hasStreams: schoolClass.hasStreams,
        nextClassId: schoolClass.nextClassId,
      }}
      classOptions={classOptions.map((item) => ({ id: item.id, name: item.name, level: item.level }))}
    />
  );
}
