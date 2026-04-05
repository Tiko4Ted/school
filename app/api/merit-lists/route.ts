import { created, fail, ok, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { meritListGenerateSchema } from "@/lib/schemas";
import { generateMeritList, getMeritList } from "@/lib/services/merit-lists";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const url = new URL(request.url);
    const examId = url.searchParams.get("examId");
    const classId = url.searchParams.get("classId");

    if (!examId || !classId) {
      throw new Error("examId and classId are required");
    }

    return ok(await getMeritList(examId, classId));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = meritListGenerateSchema.parse(await parseJson(request));
    return created(await generateMeritList(body.examId, body.classId));
  } catch (error) {
    return fail(error);
  }
}
