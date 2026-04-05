import { Role } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { created, fail, ok, parseJson } from "@/lib/api";
import { requireAdminUser, requireApiUser, requireTeacherProfile } from "@/lib/guards";
import { markReviewSchema, markSchema, marksBulkSchema } from "@/lib/schemas";
import {
  getTeacherMarkOptions,
  getTeacherStreamStudents,
  listMarks,
  reviewMarks,
  saveBulkMarks,
  saveMark,
} from "@/lib/services/marks";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const url = new URL(request.url);
    const view = url.searchParams.get("view");

    if (view === "teacher-options") {
      await requireTeacherProfile();
      return ok(await getTeacherMarkOptions(user.id));
    }

    if (view === "teacher-students") {
      await requireTeacherProfile();
      const examId = url.searchParams.get("examId");
      const streamId = url.searchParams.get("streamId");
      const subjectId = url.searchParams.get("subjectId");

      if (!examId || !streamId || !subjectId) {
        return Response.json({ error: "examId, streamId, and subjectId are required" }, { status: 400 });
      }

      return ok(await getTeacherStreamStudents(user.id, examId, streamId, subjectId));
    }

    if (user.role !== Role.ADMIN) {
      throw new AppError("Forbidden", 403);
    }

    const examId = url.searchParams.get("examId") ?? undefined;
    return ok(await listMarks(examId));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "bulk") {
      const body = marksBulkSchema.parse(await parseJson(request));
      return created(
        await saveBulkMarks({
          actorUserId: user.id,
          actorRole: user.role,
          ...body,
        }),
      );
    }

    if (action === "review") {
      await requireAdminUser();
      const body = markReviewSchema.parse(await parseJson(request));
      return created(await reviewMarks(user.id, body.examId, body.streamId, body.subjectId));
    }

    const body = markSchema.parse(await parseJson(request));
    return created(
      await saveMark({
        actorUserId: user.id,
        actorRole: user.role,
        ...body,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
