import { requireRole } from "@/lib/auth";
import { ExamsManager } from "@/components/admin/exams-manager";

export default async function AdminExamsPage() {
  await requireRole("ADMIN");
  return <ExamsManager />;
}
