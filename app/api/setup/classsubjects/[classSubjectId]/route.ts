import { fail, ok } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { removeById } from "@/lib/services/setup";

export const dynamic = "force-dynamic";

type Params = { params: { classSubjectId: string } };

export async function DELETE(_: Request, { params }: Params) {
  try {
    await requireAdminUser();
    await removeById("classSubject", params.classSubjectId);
    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
