import { ReportStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { generateRemark } from "@/lib/grading";

export async function listReports() {
  return db.publishedReport.findMany({
    include: {
      term: { include: { academicYear: true } },
      class: true,
      exams: { include: { exam: true }, orderBy: { position: "asc" } },
      remarks: { include: { student: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function publishReport(input: {
  actorUserId: string;
  termId: string;
  classId: string;
  examIds: string[];
}) {
  const exams = await db.exam.findMany({
    where: {
      id: { in: input.examIds },
      termId: input.termId,
    },
  });

  if (exams.length !== input.examIds.length) {
    throw new AppError("All selected exams must belong to the selected term");
  }

  const students = await db.student.findMany({
    where: {
      currentClassId: input.classId,
    },
    orderBy: { admissionNumber: "asc" },
  });

  const meritLists = await Promise.all(
    input.examIds.map((examId) =>
      db.meritList.findUnique({
        where: {
          examId_classId: {
            examId,
            classId: input.classId,
          },
        },
        include: { entries: true },
      }),
    ),
  );

  if (meritLists.some((item) => !item)) {
    throw new AppError("Generate merit lists for the selected exams before publishing");
  }

  return db.$transaction(async (tx) => {
    const report = await tx.publishedReport.upsert({
      where: {
        termId_classId: {
          termId: input.termId,
          classId: input.classId,
        },
      },
      update: {
        status: ReportStatus.PUBLISHED,
        publishedAt: new Date(),
        reopenedAt: null,
        updatedById: input.actorUserId,
      },
      create: {
        termId: input.termId,
        classId: input.classId,
        status: ReportStatus.PUBLISHED,
        publishedAt: new Date(),
        createdById: input.actorUserId,
        updatedById: input.actorUserId,
      },
    });

    await tx.reportExam.deleteMany({ where: { reportId: report.id } });
    await tx.studentRemark.deleteMany({ where: { reportId: report.id } });

    await tx.reportExam.createMany({
      data: input.examIds.map((examId, index) => ({
        reportId: report.id,
        examId,
        position: index + 1,
      })),
    });

    for (const student of students) {
      const relevantEntries = meritLists
        .flatMap((meritList) => meritList?.entries ?? [])
        .filter((entry) => entry.studentId === student.id);

      const averageOfAverages =
        relevantEntries.length === 0
          ? 0
          : relevantEntries.reduce((sum, entry) => sum + Number(entry.averageScore), 0) / relevantEntries.length;

      const activeTeacher = await tx.classTeacherAssignment.findFirst({
        where: {
          streamId: student.currentStreamId,
          isActive: true,
        },
        include: {
          teacher: true,
        },
      });

      await tx.studentRemark.create({
        data: {
          reportId: report.id,
          studentId: student.id,
          remark: generateRemark(averageOfAverages),
          classTeacherName: activeTeacher
            ? `${activeTeacher.teacher.firstName} ${activeTeacher.teacher.lastName}`
            : null,
        },
      });
    }

    return tx.publishedReport.findUniqueOrThrow({
      where: { id: report.id },
      include: {
        exams: { include: { exam: true }, orderBy: { position: "asc" } },
        remarks: { include: { student: true } },
        term: true,
        class: true,
      },
    });
  });
}

export async function updateRemark(input: { reportId: string; studentId: string; remark: string; classTeacherName?: string }) {
  return db.studentRemark.update({
    where: {
      reportId_studentId: {
        reportId: input.reportId,
        studentId: input.studentId,
      },
    },
    data: {
      remark: input.remark,
      classTeacherName: input.classTeacherName,
    },
  });
}

export async function reopenReport(reportId: string, actorUserId: string) {
  return db.publishedReport.update({
    where: { id: reportId },
    data: {
      status: ReportStatus.DRAFT,
      reopenedAt: new Date(),
      updatedById: actorUserId,
    },
  });
}
