import { Gender, Prisma, StudentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

type StudentPayload = {
  admissionNumber: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: Date;
  currentClassId: string;
  currentStreamId: string;
};

function normalizeGender(value: string | Gender) {
  const normalized = String(value).trim().toUpperCase();

  if (normalized === "MALE" || normalized === "M") {
    return Gender.MALE;
  }

  if (normalized === "FEMALE" || normalized === "F") {
    return Gender.FEMALE;
  }

  throw new AppError("Invalid gender value");
}

export async function listStudents(includeInactive = true) {
  return db.student.findMany({
    where: includeInactive
      ? undefined
      : {
          status: {
            in: [StudentStatus.ACTIVE, StudentStatus.PROMOTED],
          },
        },
    include: {
      currentClass: true,
      currentStream: true,
      streamHistory: {
        include: {
          class: true,
          stream: true,
        },
        orderBy: { effectiveFrom: "desc" },
      },
    },
    orderBy: [{ currentClass: { level: "asc" } }, { admissionNumber: "asc" }],
  });
}

export async function createStudent(data: StudentPayload) {
  await assertStudentPlacement(data.currentClassId, data.currentStreamId);

  return db.$transaction(async (tx) => {
    const student = await tx.student.create({
      data,
    });

    await tx.studentStreamHistory.create({
      data: {
        studentId: student.id,
        classId: data.currentClassId,
        streamId: data.currentStreamId,
        status: StudentStatus.ACTIVE,
        effectiveFrom: new Date(),
      },
    });

    return tx.student.findUniqueOrThrow({
      where: { id: student.id },
      include: {
        currentClass: true,
        currentStream: true,
      },
    });
  });
}

export async function updateStudent(studentId: string, data: Partial<StudentPayload>) {
  const current = await db.student.findUnique({
    where: { id: studentId },
  });

  if (!current) {
    throw new AppError("Student not found", 404);
  }

  const nextClassId = data.currentClassId ?? current.currentClassId;
  const nextStreamId = data.currentStreamId ?? current.currentStreamId;

  await assertStudentPlacement(nextClassId, nextStreamId);

  return db.$transaction(async (tx) => {
    const updated = await tx.student.update({
      where: { id: studentId },
      data: {
        ...data,
        currentClassId: nextClassId,
        currentStreamId: nextStreamId,
      },
    });

    if (nextClassId !== current.currentClassId || nextStreamId !== current.currentStreamId) {
      await closeActiveHistory(tx, studentId);
      await tx.studentStreamHistory.create({
        data: {
          studentId,
          classId: nextClassId,
          streamId: nextStreamId,
          status: updated.status,
          effectiveFrom: new Date(),
        },
      });
    }

    return updated;
  });
}

export async function previewBulkStudents(
  rows: Array<{
    admissionNumber: string;
    firstName: string;
    lastName: string;
    gender: string | Gender;
    dateOfBirth?: string | Date;
    classId?: string;
    streamId?: string;
  }>,
) {
  const seenIds = new Set<string>();
  
  const results = await Promise.all(
    rows.map(async (row, index) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      let resolvedGender: Gender | null = null;
      let resolvedDate: Date | null = null;

      // 1. Required: student_id + student_name (already split in normalize)
      if (!row.admissionNumber) errors.push("Missing student_id");
      if (!row.firstName) errors.push("Missing student_name");

      // 2. Duplicate Handling (Internal & DB)
      if (row.admissionNumber) {
        if (seenIds.has(row.admissionNumber)) {
          errors.push("Duplicate student_id in file");
        }
        seenIds.add(row.admissionNumber);

        const exists = await db.student.findUnique({
          where: { admissionNumber: row.admissionNumber },
          select: { id: true },
        });
        if (exists) errors.push("student_id already exists in database");
      }

      // 3. Optional: Gender
      try {
        resolvedGender = normalizeGender(row.gender || "MALE");
      } catch {
        warnings.push("Invalid gender, defaulting to MALE");
        resolvedGender = Gender.MALE;
      }

      // 4. DOB (Optional, default to 1900)
      const dobValue = row.dateOfBirth || "1900-01-01";
      const date = new Date(dobValue);
      resolvedDate = Number.isNaN(date.getTime()) ? new Date("1900-01-01") : date;

      // 5. Class Validation (Warn but still create)
      let finalClassId = row.classId;
      let finalStreamId = row.streamId;

      if (!finalClassId) {
        warnings.push("No class provided. Student will be unassigned/default.");
        // Fallback to first available class if none provided
        const firstClass = await db.class.findFirst({ include: { streams: true } });
        if (firstClass) {
          finalClassId = firstClass.id;
          finalStreamId = firstClass.streams.find(s => s.isDefault)?.id || firstClass.streams[0]?.id;
        } else {
          errors.push("No classes exist in system to assign student");
        }
      } else {
        const schoolClass = await db.class.findUnique({
          where: { id: finalClassId },
          include: { streams: true },
        });

        if (!schoolClass) {
          warnings.push("Class not found. Using system default.");
          const fallback = await db.class.findFirst({ include: { streams: true } });
          if (fallback) {
            finalClassId = fallback.id;
            finalStreamId = fallback.streams.find(s => s.isDefault)?.id || fallback.streams[0]?.id;
          } else {
            errors.push("No classes exist in system to assign student");
          }
        } else if (!finalStreamId) {
          finalStreamId = schoolClass.streams.find(s => s.isDefault)?.id || schoolClass.streams[0]?.id;
        }
      }

      return {
        index,
        admissionNumber: row.admissionNumber || "",
        firstName: row.firstName || "",
        lastName: row.lastName || "",
        gender: resolvedGender,
        dateOfBirth: resolvedDate,
        classId: finalClassId || "",
        streamId: finalStreamId || "",
        errors,
        warnings,
        valid: errors.length === 0,
      };
    }),
  );

  return {
    valid: results.every((result) => result.errors.length === 0),
    rows: results,
  };
}

export async function commitBulkStudents(
  rows: Array<{
    admissionNumber: string;
    firstName: string;
    lastName: string;
    gender: string | Gender;
    dateOfBirth?: string | Date;
    classId?: string;
    streamId?: string;
  }>,
) {
  const preview = await previewBulkStudents(rows);

  const validRows = preview.rows.filter((r) => r.valid);
  const invalidRows = preview.rows.filter((r) => !r.valid);

  const summary = {
    total: rows.length,
    created: 0,
    updated: 0,
    failed: invalidRows.length,
    errors: invalidRows.map(r => `Row ${r.index + 1} (${r.admissionNumber || 'No ID'}): ${r.errors.join(', ')}`),
    warnings: [] as string[],
  };

  if (validRows.length === 0) {
    return summary;
  }

  await db.$transaction(async (tx) => {
    for (const row of validRows) {
      const existing = await tx.student.findUnique({
        where: { admissionNumber: row.admissionNumber },
      });

      if (existing) {
        await closeActiveHistory(tx, existing.id);
        await tx.student.update({
          where: { id: existing.id },
          data: {
            firstName: row.firstName,
            lastName: row.lastName,
            gender: row.gender!,
            dateOfBirth: row.dateOfBirth!,
            currentClassId: row.classId,
            currentStreamId: row.streamId!,
            status: StudentStatus.ACTIVE,
            destinationSchool: null,
          },
        });

        await tx.studentStreamHistory.create({
          data: {
            studentId: existing.id,
            classId: row.classId,
            streamId: row.streamId!,
            status: StudentStatus.ACTIVE,
            effectiveFrom: new Date(),
          },
        });
        summary.updated++;
      } else {
        const created = await tx.student.create({
          data: {
            admissionNumber: row.admissionNumber,
            firstName: row.firstName,
            lastName: row.lastName,
            gender: row.gender!,
            dateOfBirth: row.dateOfBirth!,
            currentClassId: row.classId,
            currentStreamId: row.streamId!,
            status: StudentStatus.ACTIVE,
          },
        });

        await tx.studentStreamHistory.create({
          data: {
            studentId: created.id,
            classId: row.classId,
            streamId: row.streamId!,
            status: StudentStatus.ACTIVE,
            effectiveFrom: new Date(),
          },
        });
        summary.created++;
      }
      
      if (row.warnings.length) {
        summary.warnings.push(`Student ${row.admissionNumber}: ${row.warnings.join(', ')}`);
      }
    }
  });

  return summary;
}

export async function promoteStudents(studentIds: string[]) {
  return db.$transaction(async (tx) => {
    const students = await tx.student.findMany({
      where: { id: { in: studentIds } },
      include: { currentClass: true, currentStream: true },
    });

    const results = [];

    for (const student of students) {
      const nextClass = student.currentClass.nextClassId
        ? await tx.class.findUnique({
            where: { id: student.currentClass.nextClassId },
            include: { streams: true },
          })
        : null;

      if (!nextClass) {
        await closeActiveHistory(tx, student.id);
        const graduated = await tx.student.update({
          where: { id: student.id },
          data: {
            status: StudentStatus.GRADUATED,
          },
        });

        await tx.studentStreamHistory.create({
          data: {
            studentId: student.id,
            classId: student.currentClassId,
            streamId: student.currentStreamId,
            status: StudentStatus.GRADUATED,
            effectiveFrom: new Date(),
          },
        });

        results.push(graduated);
        continue;
      }

      const mappedStream = await tx.streamPromotionMap.findUnique({
        where: { fromStreamId: student.currentStreamId },
        include: { toStream: true },
      });

      const targetStream =
        mappedStream?.toStream ??
        nextClass.streams.find((stream) => stream.isDefault) ??
        nextClass.streams[0];

      if (!targetStream) {
        throw new AppError(`No target stream found for promoted student ${student.admissionNumber}`);
      }

      await closeActiveHistory(tx, student.id);
      const promoted = await tx.student.update({
        where: { id: student.id },
        data: {
          status: StudentStatus.PROMOTED,
          currentClassId: nextClass.id,
          currentStreamId: targetStream.id,
        },
      });

      await tx.studentStreamHistory.create({
        data: {
          studentId: student.id,
          classId: nextClass.id,
          streamId: targetStream.id,
          status: StudentStatus.PROMOTED,
          effectiveFrom: new Date(),
        },
      });

      results.push(promoted);
    }

    return results;
  });
}

export async function transferStudents(studentIds: string[], destinationSchool: string, effectiveDate: Date) {
  return db.$transaction(async (tx) => {
    const students = await tx.student.findMany({
      where: { id: { in: studentIds } },
    });

    for (const student of students) {
      await closeActiveHistory(tx, student.id, effectiveDate);

      await tx.student.update({
        where: { id: student.id },
        data: {
          status: StudentStatus.TRANSFERRED,
          destinationSchool,
        },
      });

      await tx.studentStreamHistory.create({
        data: {
          studentId: student.id,
          classId: student.currentClassId,
          streamId: student.currentStreamId,
          status: StudentStatus.TRANSFERRED,
          destinationSchool,
          effectiveFrom: effectiveDate,
        },
      });
    }

    return students.length;
  });
}

export async function graduateStudents(studentIds: string[], effectiveDate: Date) {
  return db.$transaction(async (tx) => {
    const students = await tx.student.findMany({
      where: { id: { in: studentIds } },
    });

    for (const student of students) {
      await closeActiveHistory(tx, student.id, effectiveDate);

      await tx.student.update({
        where: { id: student.id },
        data: {
          status: StudentStatus.GRADUATED,
        },
      });

      await tx.studentStreamHistory.create({
        data: {
          studentId: student.id,
          classId: student.currentClassId,
          streamId: student.currentStreamId,
          status: StudentStatus.GRADUATED,
          effectiveFrom: effectiveDate,
        },
      });
    }

    return students.length;
  });
}

async function assertStudentPlacement(classId: string, streamId: string) {
  const stream = await db.stream.findUnique({
    where: { id: streamId },
  });

  if (!stream || stream.classId !== classId) {
    throw new AppError("Stream does not belong to the selected class");
  }
}

async function closeActiveHistory(tx: Prisma.TransactionClient, studentId: string, effectiveTo = new Date()) {
  await tx.studentStreamHistory.updateMany({
    where: {
      studentId,
      effectiveTo: null,
    },
    data: {
      effectiveTo,
    },
  });
}
