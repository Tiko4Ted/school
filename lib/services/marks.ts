import { Role, StudentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function getTeacherMarkOptions(userId: string) {
  const teacher = await db.teacher.findUnique({
    where: { userId },
    include: {
      streamSubjectAssignments: {
        include: {
          stream: { include: { class: true } },
          subject: true,
        },
      },
    },
  });

  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  const exams = await db.exam.findMany({
    include: {
      term: true,
      configurations: true,
    },
    orderBy: { startDate: "desc" },
  });

  return {
    assignments: teacher.streamSubjectAssignments,
    exams,
  };
}

export async function getTeacherStreamStudents(userId: string, examId: string, streamId: string, subjectId: string) {
  const teacher = await db.teacher.findUnique({
    where: { userId },
    include: {
      streamSubjectAssignments: true,
    },
  });

  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  const assignment = teacher.streamSubjectAssignments.find(
    (item) => item.streamId === streamId && item.subjectId === subjectId,
  );

  if (!assignment) {
    throw new AppError("Teacher is not assigned to this stream and subject", 403);
  }

  const stream = await db.stream.findUnique({
    where: { id: streamId },
  });

  if (!stream) {
    throw new AppError("Stream not found", 404);
  }

  const configuration = await db.examConfiguration.findUnique({
    where: {
      examId_classId_subjectId: {
        examId,
        classId: stream.classId,
        subjectId,
      },
    },
  });

  if (!configuration) {
    throw new AppError("This class and subject are not configured for the selected exam", 400);
  }

  const students = await db.student.findMany({
    where: {
      currentStreamId: streamId,
      status: {
        in: [StudentStatus.ACTIVE, StudentStatus.PROMOTED],
      },
    },
    orderBy: { admissionNumber: "asc" },
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      lastName: true,
      marks: {
        where: {
          examId,
          subjectId,
        },
        select: {
          score: true,
        },
      },
    },
  });

  const review = await db.markReview.findUnique({
    where: {
      examId_streamId_subjectId: {
        examId,
        streamId,
        subjectId,
      },
    },
  });

  return {
    reviewLocked: Boolean(review),
    students: students.map((student) => ({
      id: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      existingScore: student.marks[0]?.score ?? null,
    })),
  };
}

export async function saveMark(input: {
  actorUserId: string;
  actorRole: Role;
  examId: string;
  studentId: string;
  subjectId: string;
  score: number;
}) {
  const user = await db.user.findUnique({
    where: { id: input.actorUserId },
    include: {
      teacher: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const student = await db.student.findUnique({
    where: { id: input.studentId },
  });

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  await assertExamConfiguration(input.examId, student.currentClassId, input.subjectId);

  if (student.status === StudentStatus.TRANSFERRED || student.status === StudentStatus.GRADUATED) {
    throw new AppError("Inactive students cannot receive new marks");
  }

  const review = await db.markReview.findUnique({
    where: {
      examId_streamId_subjectId: {
        examId: input.examId,
        streamId: student.currentStreamId,
        subjectId: input.subjectId,
      },
    },
  });

  if (input.actorRole === Role.TEACHER) {
    if (!user.teacher) {
      throw new AppError("Teacher profile not found", 404);
    }

    const assignment = await db.teacherStreamSubject.findUnique({
      where: {
        teacherId_streamId_subjectId: {
          teacherId: user.teacher.id,
          streamId: student.currentStreamId,
          subjectId: input.subjectId,
        },
      },
    });

    if (!assignment) {
      throw new AppError("Teacher is not assigned to this stream and subject", 403);
    }

    if (review) {
      throw new AppError("Marks for this stream and subject have already been reviewed", 403);
    }
  }

  return db.mark.upsert({
    where: {
      examId_studentId_subjectId: {
        examId: input.examId,
        studentId: input.studentId,
        subjectId: input.subjectId,
      },
    },
    create: {
      examId: input.examId,
      studentId: input.studentId,
      subjectId: input.subjectId,
      streamId: student.currentStreamId,
      score: input.score,
      createdById: input.actorUserId,
      updatedById: input.actorUserId,
    },
    update: {
      score: input.score,
      streamId: student.currentStreamId,
      updatedById: input.actorUserId,
    },
  });
}

export async function saveBulkMarks(input: {
  actorUserId: string;
  actorRole: Role;
  examId: string;
  streamId: string;
  subjectId: string;
  rows: Array<{ studentId: string; score: number }>;
}) {
  const review = await db.markReview.findUnique({
    where: {
      examId_streamId_subjectId: {
        examId: input.examId,
        streamId: input.streamId,
        subjectId: input.subjectId,
      },
    },
  });

  if (review && input.actorRole === Role.TEACHER) {
    throw new AppError("Marks for this stream and subject have already been reviewed", 403);
  }

  if (input.actorRole === Role.TEACHER) {
    const teacher = await db.teacher.findUnique({
      where: { userId: input.actorUserId },
    });

    if (!teacher) {
      throw new AppError("Teacher profile not found", 404);
    }

    const assignment = await db.teacherStreamSubject.findUnique({
      where: {
        teacherId_streamId_subjectId: {
          teacherId: teacher.id,
          streamId: input.streamId,
          subjectId: input.subjectId,
        },
      },
    });

    if (!assignment) {
      throw new AppError("Teacher is not assigned to this stream and subject", 403);
    }
  }

  const students = await db.student.findMany({
    where: {
      id: { in: input.rows.map((row) => row.studentId) },
      currentStreamId: input.streamId,
    },
  });

  if (students.length !== input.rows.length) {
    throw new AppError("One or more students are not in the selected stream");
  }

  if (students.some((student) => student.status === StudentStatus.TRANSFERRED || student.status === StudentStatus.GRADUATED)) {
    throw new AppError("Inactive students cannot receive new marks");
  }

  await assertExamConfiguration(input.examId, students[0]!.currentClassId, input.subjectId);

  return db.$transaction(
    input.rows.map((row) =>
      db.mark.upsert({
        where: {
          examId_studentId_subjectId: {
            examId: input.examId,
            studentId: row.studentId,
            subjectId: input.subjectId,
          },
        },
        create: {
          examId: input.examId,
          studentId: row.studentId,
          subjectId: input.subjectId,
          streamId: input.streamId,
          score: row.score,
          createdById: input.actorUserId,
          updatedById: input.actorUserId,
        },
        update: {
          score: row.score,
          updatedById: input.actorUserId,
          streamId: input.streamId,
        },
      }),
    ),
  );
}

export async function reviewMarks(actorUserId: string, examId: string, streamId: string, subjectId: string) {
  return db.markReview.upsert({
    where: {
      examId_streamId_subjectId: {
        examId,
        streamId,
        subjectId,
      },
    },
    create: {
      examId,
      streamId,
      subjectId,
      reviewedById: actorUserId,
    },
    update: {
      reviewedById: actorUserId,
      reviewedAt: new Date(),
    },
  });
}

export async function listMarks(examId?: string) {
  return db.mark.findMany({
    where: examId ? { examId } : undefined,
    include: {
      exam: true,
      student: true,
      subject: true,
      stream: { include: { class: true } },
      createdBy: { select: { email: true, role: true } },
      updatedBy: { select: { email: true, role: true } },
    },
    orderBy: [{ exam: { startDate: "desc" } }, { student: { admissionNumber: "asc" } }],
  });
}

async function assertExamConfiguration(examId: string, classId: string, subjectId: string) {
  const configuration = await db.examConfiguration.findUnique({
    where: {
      examId_classId_subjectId: {
        examId,
        classId,
        subjectId,
      },
    },
  });

  if (!configuration) {
    throw new AppError("Subject is not configured for the selected exam and class");
  }
}
