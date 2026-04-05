import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { StreamForm } from "@/components/admin/stream-form";
import { getClassById, getStreamById } from "@/lib/services/setup";

type Params = {
  params: {
    classId: string;
    id: string;
  };
};

export default async function EditStreamPage({ params }: Params) {
  await requireRole("ADMIN");
  const [schoolClass, stream] = await Promise.all([getClassById(params.classId), getStreamById(params.id)]);

  if (!schoolClass || !stream || stream.classId !== schoolClass.id) {
    notFound();
  }

  return (
    <StreamForm
      mode="edit"
      classId={schoolClass.id}
      streamId={stream.id}
      className={schoolClass.name}
      title="Edit stream"
      description="Update the stream details for this class."
      submitLabel="Save changes"
      initialValues={{ name: stream.name, isDefault: stream.isDefault }}
    />
  );
}
