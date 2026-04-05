import { fail, ok, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { subjectSchema } from "@/lib/schemas";
import { getSubjectById, normalizePrismaError, removeById, updateSubject } from "@/lib/services/setup";

export const dynamic = "force-dynamic";

type Params = { params: { subjectId: string } };

export async function GET(_: Request, { params }: Params) {
  try {
    await requireAdminUser();
    return ok(await getSubjectById(params.subjectId));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const body = subjectSchema.partial().parse(await parseJson(request));
    return ok(await updateSubject(params.subjectId, body));
  } catch (error) {
    return fail(normalizePrismaError(error));
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    await requireAdminUser();
    await removeById("subject", params.subjectId);
    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
