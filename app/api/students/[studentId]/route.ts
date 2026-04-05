import { fail, ok, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { studentSchema } from "@/lib/schemas";
import { updateStudent } from "@/lib/services/students";

export const dynamic = "force-dynamic";

type Params = { params: { studentId: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const body = studentSchema.partial().parse(await parseJson(request));
    return ok(await updateStudent(params.studentId, body));
  } catch (error) {
    return fail(error);
  }
}
