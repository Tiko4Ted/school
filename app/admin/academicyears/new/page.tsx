import { requireRole } from "@/lib/auth";
import { AcademicYearForm } from "@/components/admin/academic-year-form";

export default async function NewAcademicYearPage() {
  await requireRole("ADMIN");

  return (
    <AcademicYearForm
      title="Create academic year"
      description="Add a new academic year and configure its active period."
      submitLabel="Create academic year"
      initialValues={{
        name: "",
        startDate: "",
        endDate: "",
        isActive: false,
      }}
    />
  );
}
