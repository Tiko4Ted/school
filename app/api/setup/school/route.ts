import { created, fail, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { schoolSchema } from "@/lib/schemas";
import { upsertSchool } from "@/lib/services/setup";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = schoolSchema.parse(await parseJson(request));
    const school = await upsertSchool(body.name);
    return created(school);
  } catch (error) {
    return fail(error);
  }
}
