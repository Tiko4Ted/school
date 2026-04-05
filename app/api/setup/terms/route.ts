import { created, fail, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { termSchema } from "@/lib/schemas";
import { createTerm, listTermsByAcademicYear, normalizePrismaError } from "@/lib/services/setup";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const url = new URL(request.url);
    const academicYearId = url.searchParams.get("academicYearId");

    if (!academicYearId) {
      return Response.json({ error: "academicYearId is required" }, { status: 400 });
    }

    return Response.json({ data: await listTermsByAcademicYear(academicYearId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = termSchema.parse(await parseJson(request));
    return created(await createTerm(body));
  } catch (error) {
    return fail(normalizePrismaError(error));
  }
}
