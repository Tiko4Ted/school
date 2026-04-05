import { fail, ok, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { academicYearSchema } from "@/lib/schemas";
import { getAcademicYearById, normalizePrismaError, removeById, updateAcademicYear } from "@/lib/services/setup";

export const dynamic = "force-dynamic";

type Params = { params: { academicYearId: string } };

export async function GET(_: Request, { params }: Params) {
  try {
    await requireAdminUser();
    return ok(await getAcademicYearById(params.academicYearId));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const body = academicYearSchema.partial().parse(await parseJson(request));
    return ok(await updateAcademicYear(params.academicYearId, body));
  } catch (error) {
    return fail(normalizePrismaError(error));
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    await requireAdminUser();
    await removeById("academicYear", params.academicYearId);
    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
