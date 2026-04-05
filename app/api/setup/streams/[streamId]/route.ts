import { fail, ok, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import { streamSchema } from "@/lib/schemas";
import { getStreamById, normalizePrismaError, removeById, updateStream } from "@/lib/services/setup";

export const dynamic = "force-dynamic";

type Params = { params: { streamId: string } };

export async function GET(_: Request, { params }: Params) {
  try {
    await requireAdminUser();
    return ok(await getStreamById(params.streamId));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const body = streamSchema.omit({ classId: true }).partial().parse(await parseJson(request));
    return ok(await updateStream(params.streamId, body));
  } catch (error) {
    return fail(normalizePrismaError(error));
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    await requireAdminUser();
    await removeById("stream", params.streamId);
    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
