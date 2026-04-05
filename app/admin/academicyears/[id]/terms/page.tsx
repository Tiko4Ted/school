import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { TermsManager } from "@/components/admin/terms-manager";
import { getAcademicYearById } from "@/lib/services/setup";

type Params = {
  params: {
    id: string;
  };
};

export default async function AcademicYearTermsPage({ params }: Params) {
  await requireRole("ADMIN");
  const academicYear = await getAcademicYearById(params.id);

  if (!academicYear) {
    notFound();
  }

  return <TermsManager academicYearId={academicYear.id} academicYearName={academicYear.name} />;
}
