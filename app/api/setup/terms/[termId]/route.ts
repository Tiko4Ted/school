import { fail, ok, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { termSchema } from "@/lib/schemas";
import { getTermById, normalizePrismaError, removeById, updateTerm } from "@/lib/services/setup";

export const dynamic = "force-dynamic";

type Params = { params: { termId: string } };

export async function GET(_: Request, { params }: Params) {
  try {
    await requireAdminUser();
    return ok(await getTermById(params.termId));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const body = termSchema.omit({ academicYearId: true }).partial().parse(await parseJson(request));
    return ok(await updateTerm(params.termId, body));
  } catch (error) {
    return fail(normalizePrismaError(error));
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    await requireAdminUser();
    await removeById("term", params.termId);
    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
