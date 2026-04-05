import { fail, ok, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { examUpdateSchema } from "@/lib/schemas";
import { deleteExam, updateExam } from "@/lib/services/exams";

export const dynamic = "force-dynamic";

type Params = { params: { examId: string } };

export async function DELETE(_: Request, { params }: Params) {
  try {
    await requireAdminUser();
    await deleteExam(params.examId);
    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const body = examUpdateSchema.parse(await parseJson(request));
    return ok(await updateExam(params.examId, body));
  } catch (error) {
    return fail(error);
  }
}
