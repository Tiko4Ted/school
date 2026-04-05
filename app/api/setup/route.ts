import { ok, fail } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { listSetupData } from "@/lib/services/setup";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminUser();
    const [school, classes, subjects, academicYears] = await listSetupData();
    return ok({ school, classes, subjects, academicYears });
  } catch (error) {
    return fail(error);
  }
}
