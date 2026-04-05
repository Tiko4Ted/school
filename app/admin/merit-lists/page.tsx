import { requireRole } from "@/lib/auth";
import { MeritListsManager } from "@/components/admin/merit-lists-manager";

export default async function AdminMeritListsPage() {
  await requireRole("ADMIN");
  return <MeritListsManager />;
}
