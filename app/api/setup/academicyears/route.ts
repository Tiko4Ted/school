import { created, fail, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { academicYearSchema } from "@/lib/schemas";
import { createAcademicYear, listAcademicYears, normalizePrismaError } from "@/lib/services/setup";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminUser();
    return Response.json({ data: await listAcademicYears() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = academicYearSchema.parse(await parseJson(request));
    return created(await createAcademicYear(body));
  } catch (error) {
    return fail(normalizePrismaError(error));
  }
}
