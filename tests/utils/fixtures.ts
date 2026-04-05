import { randomUUID } from "node:crypto";
import { Gender, Role, StudentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

let classLevelSeed = 100;

function nextClassLevel() {
  classLevelSeed += 1;
  return classLevelSeed;
}

function uniqueSuffix() {
  return randomUUID().slice(0, 8);
}

type SeedOptions = {
  primaryStudents?: number;
  secondaryStudents?: number;
};

export async function seedIntegrationGraph(options: SeedOptions = {}) {
  const suffix = uniqueSuffix();
  const adminPassword = await hashPassword("Admin!234");
  const teacherPassword = await hashPassword("Teacher!234");

  const adminUser = await db.user.create({
    data: {
      email: `admin+${suffix}@schoolms.local`,
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  const teacherUser = await db.user.create({
    data: {
      email: `teacher+${suffix}@schoolms.local`,
      passwordHash: teacherPassword,
      role: Role.TEACHER,
    },
  });

  const teacher = await db.teacher.create({
    data: {
      userId: teacherUser.id,
      employeeNumber: `EMP-${suffix}`,
      firstName: "Test",
      lastName: "Teacher",
    },
  });

  const classLevel = nextClassLevel();
  const schoolClass = await db.class.create({
    data: {
      name: `Test Class ${classLevel}`,
      level: classLevel,
      hasStreams: true,
    },
  });

  const primaryStream = await db.stream.create({
    data: {
      classId: schoolClass.id,
      name: `Primary-${suffix}`,
      isDefault: true,
    },
  });

  const secondaryStream = await db.stream.create({
    data: {
      classId: schoolClass.id,
      name: `Secondary-${suffix}`,
      isDefault: false,
    },
  });

  const subject = await db.subject.create({
    data: {
      name: `Subject ${suffix}`,
      code: `SUB-${suffix}`,
    },
  });

  await db.classSubject.create({
    data: {
      classId: schoolClass.id,
      subjectId: subject.id,
    },
  });

  const academicYear = await db.academicYear.create({
    data: {
      name: `AY-${suffix}`,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-01"),
      isActive: true,
    },
  });

  const term = await db.term.create({
    data: {
      academicYearId: academicYear.id,
      name: `Term-${suffix}`,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-31"),
      isActive: true,
    },
  });

  const exam = await db.exam.create({
    data: {
      termId: term.id,
      name: `Exam-${suffix}`,
      startDate: new Date("2026-02-01"),
    },
  });

  await db.examConfiguration.create({
    data: {
      examId: exam.id,
      classId: schoolClass.id,
      subjectId: subject.id,
    },
  });

  const primaryCount = options.primaryStudents ?? 2;
  const secondaryCount = options.secondaryStudents ?? 1;

  const primaryStudents = [];
  for (let index = 0; index < primaryCount; index += 1) {
    const student = await db.student.create({
      data: {
        admissionNumber: `ADM-${suffix}-P${index + 1}`,
        firstName: `Primary${index + 1}`,
        lastName: "Student",
        gender: index % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        dateOfBirth: new Date("2013-01-01"),
        status: StudentStatus.ACTIVE,
        currentClassId: schoolClass.id,
        currentStreamId: primaryStream.id,
      },
    });

    await db.studentStreamHistory.create({
      data: {
        studentId: student.id,
        classId: schoolClass.id,
        streamId: primaryStream.id,
        status: StudentStatus.ACTIVE,
        effectiveFrom: new Date("2026-01-01"),
      },
    });

    primaryStudents.push(student);
  }

  const secondaryStudents = [];
  for (let index = 0; index < secondaryCount; index += 1) {
    const student = await db.student.create({
      data: {
        admissionNumber: `ADM-${suffix}-S${index + 1}`,
        firstName: `Secondary${index + 1}`,
        lastName: "Student",
        gender: index % 2 === 0 ? Gender.FEMALE : Gender.MALE,
        dateOfBirth: new Date("2013-05-01"),
        status: StudentStatus.ACTIVE,
        currentClassId: schoolClass.id,
        currentStreamId: secondaryStream.id,
      },
    });

    await db.studentStreamHistory.create({
      data: {
        studentId: student.id,
        classId: schoolClass.id,
        streamId: secondaryStream.id,
        status: StudentStatus.ACTIVE,
        effectiveFrom: new Date("2026-01-01"),
      },
    });

    secondaryStudents.push(student);
  }

  await db.teacherStreamSubject.create({
    data: {
      teacherId: teacher.id,
      streamId: primaryStream.id,
      subjectId: subject.id,
    },
  });

  await db.classTeacherAssignment.create({
    data: {
      teacherId: teacher.id,
      streamId: primaryStream.id,
      startDate: new Date("2026-01-01"),
      isActive: true,
    },
  });

  return {
    adminUser,
    teacherUser,
    teacher,
    schoolClass,
    streams: {
      primary: primaryStream,
      secondary: secondaryStream,
    },
    subject,
    exam,
    term,
    academicYear,
    students: {
      primary: primaryStudents,
      secondary: secondaryStudents,
    },
  };
}
