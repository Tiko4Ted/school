import { created, fail, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { streamSchema } from "@/lib/schemas";
import { createStream, listStreamsByClassId, normalizePrismaError } from "@/lib/services/setup";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");

    if (!classId) {
      return Response.json({ error: "classId is required" }, { status: 400 });
    }

    return Response.json({ data: await listStreamsByClassId(classId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = streamSchema.parse(await parseJson(request));
    return created(await createStream(body));
  } catch (error) {
    return fail(normalizePrismaError(error));
  }
}
