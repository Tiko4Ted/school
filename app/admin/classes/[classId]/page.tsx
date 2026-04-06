import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { ClassForm } from "@/components/admin/class-form";
import { StreamsManager } from "@/components/admin/streams-manager";
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
    <div className="space-y-10">
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

      {schoolClass.hasStreams && (
        <StreamsManager classId={schoolClass.id} className={schoolClass.name} />
      )}
    </div>
  );
}
