import { requireRole } from "@/lib/auth";
import { StudentsManager } from "@/components/admin/students-manager";

export default async function AdminStudentsPage() {
  await requireRole("ADMIN");
  return <StudentsManager />;
}
