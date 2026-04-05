import { created, fail, ok, parseJson } from "@/lib/api";
import { requireAdminUser } from "@/lib/guards";
import {
  bulkStudentCommitSchema,
  graduateStudentsSchema,
  promoteStudentsSchema,
  studentSchema,
  transferStudentsSchema,
} from "@/lib/schemas";
import {
  commitBulkStudents,
  createStudent,
  graduateStudents,
  listStudents,
  previewBulkStudents,
  promoteStudents,
  transferStudents,
} from "@/lib/services/students";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get("includeInactive") !== "false";
    return ok(await listStudents(includeInactive));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "bulk-preview") {
      const body = bulkStudentCommitSchema.parse(await parseJson(request));
      return ok(await previewBulkStudents(body.rows));
    }

    if (action === "bulk-commit") {
      const body = bulkStudentCommitSchema.parse(await parseJson(request));
      return created(await commitBulkStudents(body.rows));
    }

    if (action === "promote") {
      const body = promoteStudentsSchema.parse(await parseJson(request));
      return ok(await promoteStudents(body.studentIds));
    }

    if (action === "transfer") {
      const body = transferStudentsSchema.parse(await parseJson(request));
      return ok(await transferStudents(body.studentIds, body.destinationSchool, body.effectiveDate));
    }

    if (action === "graduate") {
      const body = graduateStudentsSchema.parse(await parseJson(request));
      return ok(await graduateStudents(body.studentIds, body.effectiveDate));
    }

    const body = studentSchema.parse(await parseJson(request));
    return created(await createStudent(body));
  } catch (error) {
    return fail(error);
  }
}
