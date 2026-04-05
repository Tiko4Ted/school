import { created, fail, ok, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { teacherSchema, teacherAssignmentSchema, classTeacherAssignmentSchema } from "@/lib/schemas";
import { assignClassTeacher, assignTeacherToStreamSubject, createTeacher, listTeachers } from "@/lib/services/teachers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminUser();
    return ok(await listTeachers());
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "assign-stream-subject") {
      const body = teacherAssignmentSchema.parse(await parseJson(request));
      return created(await assignTeacherToStreamSubject(body));
    }

    if (action === "assign-class-teacher") {
      const body = classTeacherAssignmentSchema.parse(await parseJson(request));
      return created(await assignClassTeacher(body));
    }

    const body = teacherSchema.parse(await parseJson(request));
    return created(await createTeacher(body));
  } catch (error) {
    return fail(error);
  }
}
