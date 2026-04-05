import { requireRole } from "@/lib/auth";
import { AcademicYearsTable } from "@/components/admin/academic-years-table";

export default async function AcademicYearsPage() {
  await requireRole("ADMIN");
  return <AcademicYearsTable />;
}
