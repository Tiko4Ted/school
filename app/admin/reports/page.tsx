import { requireRole } from "@/lib/auth";
import { ReportsManager } from "@/components/admin/reports-manager";

export default async function AdminReportsPage() {
  await requireRole("ADMIN");
  return <ReportsManager />;
}
