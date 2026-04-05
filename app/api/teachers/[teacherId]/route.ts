import { fail, ok, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { teacherUpdateSchema } from "@/lib/schemas";
import { updateTeacher } from "@/lib/services/teachers";

export const dynamic = "force-dynamic";

type Params = {
  params: {
    teacherId: string;
  };
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const body = teacherUpdateSchema.parse(await parseJson(request));
    return ok(await updateTeacher(params.teacherId, body));
  } catch (error) {
    return fail(error);
  }
}
