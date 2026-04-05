import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { StreamsTable } from "@/components/admin/streams-table";
import { getClassById } from "@/lib/services/setup";

type Params = {
  params: {
    classId: string;
  };
};

export default async function ClassStreamsPage({ params }: Params) {
  await requireRole("ADMIN");
  const schoolClass = await getClassById(params.classId);

  if (!schoolClass) {
    notFound();
  }

  return <StreamsTable classId={schoolClass.id} className={schoolClass.name} />;
}
