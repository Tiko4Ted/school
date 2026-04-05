import { created, fail, ok, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { examConfigurationSchema, examSchema } from "@/lib/schemas";
import { configureExamSubjects, createExam, listExams } from "@/lib/services/exams";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminUser();
    return ok(await listExams());
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "configure") {
      const body = examConfigurationSchema.parse(await parseJson(request));
      return ok(await configureExamSubjects(body));
    }

    const body = examSchema.parse(await parseJson(request));
    return created(await createExam(body));
  } catch (error) {
    return fail(error);
  }
}
