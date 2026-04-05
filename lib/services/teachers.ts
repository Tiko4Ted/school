import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";

const teacherWithAssignmentsInclude = {
  user: {
    select: {
      id: true,
      email: true,
      role: true,
    },
  },
  streamSubjectAssignments: {
    include: {
      stream: { include: { class: true } },
      subject: true,
    },
  },
  classTeacherAssignments: {
    include: {
      stream: { include: { class: true } },
    },
    orderBy: { startDate: "desc" },
  },
} as const;

export async function listTeachers() {
  return db.teacher.findMany({
    include: teacherWithAssignmentsInclude,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}

export async function createTeacher(data: {
  email: string;
  password: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
}) {
  const email = data.email.toLowerCase();

  return db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new AppError("Email already exists", 409);
    }

    const user = await tx.user.create({
      data: {
        email,
        passwordHash: await hashPassword(data.password),
        role: Role.TEACHER,
      },
    });

    return tx.teacher.create({
      data: {
        userId: user.id,
        employeeNumber: data.employeeNumber,
        firstName: data.firstName,
        lastName: data.lastName,
      },
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
    });
  });
}

export async function updateTeacher(
  teacherId: string,
  data: {
    email?: string;
    password?: string;
    employeeNumber?: string;
    firstName?: string;
    lastName?: string;
  },
) {
  return db.$transaction(async (tx) => {
    const teacher = await tx.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });

    if (!teacher) {
      throw new AppError("Teacher not found", 404);
    }

    const teacherData: Partial<{ employeeNumber: string; firstName: string; lastName: string }> = {};
    if (data.employeeNumber && data.employeeNumber !== teacher.employeeNumber) {
      teacherData.employeeNumber = data.employeeNumber;
    }
    if (data.firstName && data.firstName !== teacher.firstName) {
      teacherData.firstName = data.firstName;
    }
    if (data.lastName && data.lastName !== teacher.lastName) {
      teacherData.lastName = data.lastName;
    }

    const userData: Partial<{ email: string; passwordHash: string }> = {};
    if (data.email) {
      const email = data.email.toLowerCase();
      if (email !== teacher.user.email) {
        const existing = await tx.user.findUnique({
          where: { email },
        });

        if (existing) {
          throw new AppError("Email already exists", 409);
        }

        userData.email = email;
      }
    }

    if (data.password) {
      userData.passwordHash = await hashPassword(data.password);
    }

    if (Object.keys(userData).length > 0) {
      await tx.user.update({
        where: { id: teacher.userId },
        data: userData,
      });
    }

    if (Object.keys(teacherData).length > 0) {
      await tx.teacher.update({
        where: { id: teacherId },
        data: teacherData,
      });
    }

    const updated = await tx.teacher.findUnique({
      where: { id: teacherId },
      include: teacherWithAssignmentsInclude,
    });

    if (!updated) {
      throw new AppError("Teacher not found", 404);
    }

    return updated;
  });
}

export async function assignTeacherToStreamSubject(data: { teacherId: string; streamId: string; subjectId: string }) {
  const [teacher, stream, subject] = await Promise.all([
    db.teacher.findUnique({ where: { id: data.teacherId } }),
    db.stream.findUnique({ where: { id: data.streamId }, include: { class: true } }),
    db.subject.findUnique({ where: { id: data.subjectId } }),
  ]);

  if (!teacher || !stream || !subject) {
    throw new AppError("Teacher, stream, or subject not found", 404);
  }

  const classSubject = await db.classSubject.findUnique({
    where: {
      classId_subjectId: {
        classId: stream.classId,
        subjectId: data.subjectId,
      },
    },
  });

  if (!classSubject) {
    throw new AppError("Subject is not configured for the stream's class");
  }

  return db.teacherStreamSubject.create({
    data,
    include: {
      stream: { include: { class: true } },
      subject: true,
    },
  });
}

export async function assignClassTeacher(data: { teacherId: string; streamId: string; startDate: Date }) {
  const [teacher, stream] = await Promise.all([
    db.teacher.findUnique({ where: { id: data.teacherId } }),
    db.stream.findUnique({ where: { id: data.streamId } }),
  ]);

  if (!teacher || !stream) {
    throw new AppError("Teacher or stream not found", 404);
  }

  return db.$transaction(async (tx) => {
    const activeForStream = await tx.classTeacherAssignment.findFirst({
      where: { streamId: data.streamId, isActive: true },
    });
    const activeForTeacher = await tx.classTeacherAssignment.findFirst({
      where: { teacherId: data.teacherId, isActive: true },
    });

    if (activeForStream && activeForStream.teacherId !== data.teacherId) {
      await tx.classTeacherAssignment.update({
        where: { id: activeForStream.id },
        data: {
          isActive: false,
          endDate: data.startDate,
        },
      });
    }

    if (activeForTeacher && activeForTeacher.streamId !== data.streamId) {
      await tx.classTeacherAssignment.update({
        where: { id: activeForTeacher.id },
        data: {
          isActive: false,
          endDate: data.startDate,
        },
      });
    }

    return tx.classTeacherAssignment.create({
      data: {
        teacherId: data.teacherId,
        streamId: data.streamId,
        startDate: data.startDate,
        isActive: true,
      },
      include: {
        teacher: true,
        stream: { include: { class: true } },
      },
    });
  });
}
