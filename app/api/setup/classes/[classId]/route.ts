import { fail, ok, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { classSchema } from "@/lib/schemas";
import { getClassById, normalizePrismaError, removeById, updateClass } from "@/lib/services/setup";

export const dynamic = "force-dynamic";

type Params = { params: { classId: string } };

export async function GET(_: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const schoolClass = await getClassById(params.classId);
    return ok(schoolClass);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const body = classSchema.partial().parse(await parseJson(request));
    return ok(await updateClass(params.classId, body));
  } catch (error) {
    return fail(normalizePrismaError(error));
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    await requireAdminUser();
    await removeById("class", params.classId);
    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
