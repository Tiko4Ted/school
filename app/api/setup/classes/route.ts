import { created, fail, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { classSchema } from "@/lib/schemas";
import { createClass, listClasses, normalizePrismaError } from "@/lib/services/setup";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminUser();
    return Response.json({ data: await listClasses() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = classSchema.parse(await parseJson(request));
    return created(await createClass(body));
  } catch (error) {
    return fail(normalizePrismaError(error));
  }
}
