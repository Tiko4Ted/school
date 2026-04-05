import { created, fail, ok, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { reportRemarkSchema, reportSchema } from "@/lib/schemas";
import { listReports, publishReport, reopenReport, updateRemark } from "@/lib/services/reports";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminUser();
    return ok(await listReports());
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminUser();
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "remark") {
      const body = reportRemarkSchema.parse(await parseJson(request));
      return ok(await updateRemark(body));
    }

    if (action === "reopen") {
      const body = (await parseJson<{ reportId: string }>(request)).reportId;
      return ok(await reopenReport(body, user.id));
    }

    const body = reportSchema.parse(await parseJson(request));
    return created(
      await publishReport({
        actorUserId: user.id,
        ...body,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
