import { created, fail, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { classSubjectSchema } from "@/lib/schemas";
import { assignSubjectToClass, listClassSubjects, normalizePrismaError } from "@/lib/services/setup";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");

    if (!classId) {
      return Response.json({ error: "classId is required" }, { status: 400 });
    }

    return Response.json({ data: await listClassSubjects(classId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = classSubjectSchema.parse(await parseJson(request));
    return created(await assignSubjectToClass(body.classId, body.subjectId));
  } catch (error) {
    return fail(normalizePrismaError(error));
  }
}
