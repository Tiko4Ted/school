import { requireRole } from "@/lib/auth";
import { SubjectsTable } from "@/components/admin/subjects-table";

export default async function AdminSubjectsPage() {
  await requireRole("ADMIN");
  return <SubjectsTable />;
}
