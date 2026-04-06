import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function upsertSchool(name: string) {
  const existing = await db.school.findFirst();

  if (existing) {
    return db.school.update({
      where: { id: existing.id },
      data: { name },
    });
  }

  return db.school.create({
    data: { name },
  });
}

export async function listSetupData() {
  return db.$transaction([
    db.school.findFirst(),
    db.class.findMany({
      include: {
        nextClass: true,
        streams: true,
        classSubjects: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: { level: "asc" },
    }),
    db.subject.findMany({ orderBy: { name: "asc" } }),
    db.academicYear.findMany({
      include: { terms: true },
      orderBy: { startDate: "asc" },
    }),
  ]);
}

export async function listClasses() {
  return db.class.findMany({
    include: {
      nextClass: true,
    },
    orderBy: { level: "asc" },
  });
}

export async function getClassById(classId: string) {
  return db.class.findUnique({
    where: { id: classId },
    include: {
      nextClass: true,
      streams: {
        orderBy: { name: "asc" },
      },
    },
  });
}

export async function listStreamsByClassId(classId: string) {
  return db.stream.findMany({
    where: { classId },
    include: {
      classTeacherAssignments: {
        where: { isActive: true },
        include: { teacher: true },
      },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getStreamById(streamId: string) {
  return db.stream.findUnique({
    where: { id: streamId },
    include: {
      class: true,
      classTeacherAssignments: {
        where: { isActive: true },
        include: { teacher: true },
      },
    },
  });
}

export async function createClass(data: {
  name: string;
  level: number;
  hasStreams: boolean;
  nextClassId?: string | null;
}) {
  return db.class.create({
    data: {
      name: data.name,
      level: data.level,
      hasStreams: data.hasStreams,
      nextClassId: data.nextClassId ?? null,
    },
  });
}

export async function updateClass(
  classId: string,
  data: Partial<{ name: string; level: number; hasStreams: boolean; nextClassId: string | null }>,
) {
  return db.class.update({
    where: { id: classId },
    data,
  });
}

export async function createStream(data: { classId: string; name: string; isDefault: boolean; teacherId?: string }) {
  const schoolClass = await db.class.findUnique({
    where: { id: data.classId },
  });

  if (!schoolClass) {
    throw new AppError("Class not found", 404);
  }

  if (!schoolClass.hasStreams && data.name !== "DEFAULT") {
    throw new AppError("Streamless classes must use the DEFAULT stream name");
  }

  return db.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.stream.updateMany({
        where: { classId: data.classId, isDefault: true },
        data: { isDefault: false },
      });
    }

    if (data.teacherId) {
      const activeAssignment = await tx.classTeacherAssignment.findFirst({
        where: { teacherId: data.teacherId, isActive: true },
      });
      if (activeAssignment) {
        throw new AppError("Teacher is already assigned to another active stream", 400);
      }
    }

    const stream = await tx.stream.create({
      data: {
        classId: data.classId,
        name: data.name,
        isDefault: data.isDefault,
      },
    });

    if (data.teacherId) {
      await tx.classTeacherAssignment.create({
        data: {
          streamId: stream.id,
          teacherId: data.teacherId,
          startDate: new Date(),
          isActive: true,
        },
      });
    }

    return stream;
  });
}

export async function updateStream(
  streamId: string,
  data: Partial<{ name: string; isDefault: boolean; teacherId: string }>,
) {
  const stream = await db.stream.findUnique({
    where: { id: streamId },
    include: { classTeacherAssignments: { where: { isActive: true } } },
  });

  if (!stream) {
    throw new AppError("Stream not found", 404);
  }

  return db.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.stream.updateMany({
        where: { classId: stream.classId, isDefault: true },
        data: { isDefault: false },
      });
    }

    if (data.teacherId !== undefined) {
      const currentActive = stream.classTeacherAssignments[0];

      if (!currentActive || currentActive.teacherId !== data.teacherId) {
        if (data.teacherId) {
          const teacherBusy = await tx.classTeacherAssignment.findFirst({
            where: { teacherId: data.teacherId, isActive: true, NOT: { streamId } },
          });
          if (teacherBusy) {
            throw new AppError("Teacher is already assigned to another active stream", 400);
          }
        }

        if (currentActive) {
          await tx.classTeacherAssignment.update({
            where: { id: currentActive.id },
            data: { isActive: false, endDate: new Date() },
          });
        }

        if (data.teacherId) {
          await tx.classTeacherAssignment.create({
            data: {
              streamId,
              teacherId: data.teacherId,
              startDate: new Date(),
              isActive: true,
            },
          });
        }
      }
    }

    return tx.stream.update({
      where: { id: streamId },
      data: {
        name: data.name,
        isDefault: data.isDefault,
      },
    });
  });
}

export async function createSubject(data: { name: string; code: string }) {
  return db.subject.create({ data });
}

export async function listSubjects() {
  return db.subject.findMany({
    orderBy: [{ name: "asc" }, { code: "asc" }],
  });
}

export async function getSubjectById(subjectId: string) {
  return db.subject.findUnique({
    where: { id: subjectId },
  });
}

export async function updateSubject(subjectId: string, data: Partial<{ name: string; code: string }>) {
  return db.subject.update({
    where: { id: subjectId },
    data,
  });
}

export async function assignSubjectToClass(classId: string, subjectId: string) {
  const schoolClass = await db.class.findUnique({ where: { id: classId } });
  const subject = await db.subject.findUnique({ where: { id: subjectId } });

  if (!schoolClass || !subject) {
    throw new AppError("Class or subject not found", 404);
  }

  return db.classSubject.create({
    data: { classId, subjectId },
  });
}

export async function listClassSubjects(classId: string) {
  return db.classSubject.findMany({
    where: { classId },
    include: {
      subject: true,
    },
    orderBy: {
      subject: {
        name: "asc",
      },
    },
  });
}

export async function createAcademicYear(data: { name: string; startDate: Date; endDate: Date; isActive: boolean }) {
  if (data.endDate <= data.startDate) {
    throw new AppError("Academic year end date must be after start date");
  }

  return db.$transaction(async (tx) => {
    if (data.isActive) {
      await tx.academicYear.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    return tx.academicYear.create({ data });
  });
}

export async function listAcademicYears() {
  return db.academicYear.findMany({
    include: {
      terms: {
        orderBy: { startDate: "asc" },
      },
    },
    orderBy: { startDate: "asc" },
  });
}

export async function getAcademicYearById(academicYearId: string) {
  return db.academicYear.findUnique({
    where: { id: academicYearId },
    include: {
      terms: {
        orderBy: { startDate: "asc" },
      },
    },
  });
}

export async function updateAcademicYear(
  academicYearId: string,
  data: Partial<{ name: string; startDate: Date; endDate: Date; isActive: boolean }>,
) {
  if (data.startDate && data.endDate && data.endDate <= data.startDate) {
    throw new AppError("Academic year end date must be after start date");
  }

  return db.$transaction(async (tx) => {
    if (data.isActive) {
      await tx.academicYear.updateMany({
        where: { isActive: true, NOT: { id: academicYearId } },
        data: { isActive: false },
      });
    }

    return tx.academicYear.update({
      where: { id: academicYearId },
      data,
    });
  });
}

export async function createTerm(data: {
  academicYearId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}) {
  if (data.endDate <= data.startDate) {
    throw new AppError("Term end date must be after start date");
  }

  return db.$transaction(async (tx) => {
    if (data.isActive) {
      await tx.term.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    return tx.term.create({ data });
  });
}

export async function listTermsByAcademicYear(academicYearId: string) {
  return db.term.findMany({
    where: { academicYearId },
    orderBy: { startDate: "asc" },
  });
}

export async function getTermById(termId: string) {
  return db.term.findUnique({
    where: { id: termId },
  });
}

export async function updateTerm(
  termId: string,
  data: Partial<{ name: string; startDate: Date; endDate: Date; isActive: boolean }>,
) {
  if (data.startDate && data.endDate && data.endDate <= data.startDate) {
    throw new AppError("Term end date must be after start date");
  }

  const current = await db.term.findUnique({
    where: { id: termId },
  });

  if (!current) {
    throw new AppError("Term not found", 404);
  }

  return db.$transaction(async (tx) => {
    if (data.isActive) {
      await tx.term.updateMany({
        where: { isActive: true, NOT: { id: termId } },
        data: { isActive: false },
      });
    }

    return tx.term.update({
      where: { id: termId },
      data,
    });
  });
}

export async function removeById(
  model: "class" | "stream" | "subject" | "classSubject" | "academicYear" | "term",
  id: string,
) {
  const delegate = db[model] as unknown as { delete: (args: { where: { id: string } }) => Promise<unknown> };
  return delegate.delete({ where: { id } });
}

export function normalizePrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new AppError("Duplicate value violates a unique constraint", 409, error.meta);
  }

  throw error;
}
