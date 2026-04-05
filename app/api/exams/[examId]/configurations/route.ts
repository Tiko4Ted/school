import { fail, ok, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { examConfigurationSchema } from "@/lib/schemas";
import { configureExamSubjects, getExamConfiguration } from "@/lib/services/exams";

export const dynamic = "force-dynamic";

type Params = { params: { examId: string } };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");

    if (!classId) {
      return Response.json({ error: "classId is required" }, { status: 400 });
    }

    return ok(await getExamConfiguration(params.examId, classId));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const body = examConfigurationSchema.omit({ examId: true }).parse(await parseJson(request));
    return ok(await configureExamSubjects({ examId: params.examId, ...body }));
  } catch (error) {
    return fail(error);
  }
}
