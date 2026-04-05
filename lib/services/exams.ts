import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function listExams() {
  return db.exam.findMany({
    include: {
      term: {
        include: {
          academicYear: true,
        },
      },
      configurations: {
        include: {
          class: true,
          subject: true,
        },
      },
    },
    orderBy: { startDate: "desc" },
  });
}

export async function createExam(data: { termId: string; name: string; startDate: Date; endDate?: Date | null }) {
  return db.exam.create({
    data,
  });
}

export async function updateExam(
  examId: string,
  data: Partial<{ termId: string; name: string; startDate: Date; endDate?: Date | null }>,
) {
  return db.exam.update({
    where: { id: examId },
    data,
  });
}

export async function configureExamSubjects(data: { examId: string; classId: string; subjectIds: string[] }) {
  const schoolClass = await db.class.findUnique({
    where: { id: data.classId },
  });

  if (!schoolClass) {
    throw new AppError("Class not found", 404);
  }

  const classSubjects = await db.classSubject.findMany({
    where: {
      classId: data.classId,
      subjectId: { in: data.subjectIds },
    },
  });

  if (classSubjects.length !== data.subjectIds.length) {
    throw new AppError("One or more subjects are not mapped to the class");
  }

  await db.examConfiguration.deleteMany({
    where: { examId: data.examId, classId: data.classId },
  });

  return db.examConfiguration.createMany({
    data: data.subjectIds.map((subjectId) => ({
      examId: data.examId,
      classId: data.classId,
      subjectId,
    })),
    skipDuplicates: true,
  });
}

export async function getExamConfiguration(examId: string, classId: string) {
  return db.examConfiguration.findMany({
    where: { examId, classId },
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

export async function deleteExam(examId: string) {
  return db.exam.delete({
    where: { id: examId },
  });
}
