import { requireRole } from "@/lib/auth";
import { TeachersManager } from "@/components/admin/teachers-manager";

export default async function AdminTeachersPage() {
  await requireRole("ADMIN");
  return <TeachersManager />;
}
