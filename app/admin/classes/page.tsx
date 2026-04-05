import { requireRole } from "@/lib/auth";
import { ClassesTable } from "@/components/admin/classes-table";

export default async function AdminClassesPage() {
  await requireRole("ADMIN");
  return <ClassesTable />;
}
