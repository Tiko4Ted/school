import { created, fail, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { subjectSchema } from "@/lib/schemas";
import { createSubject, listSubjects, normalizePrismaError } from "@/lib/services/setup";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminUser();
    return Response.json({ data: await listSubjects() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = subjectSchema.parse(await parseJson(request));
    return created(await createSubject(body));
  } catch (error) {
    return fail(normalizePrismaError(error));
  }
}
