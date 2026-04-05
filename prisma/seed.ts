import { Gender, Role, StudentStatus } from "@prisma/client";
import { db } from "../lib/db";
import { hashPassword } from "../lib/password";

async function main() {
  await db.school.upsert({
    where: { id: "schoolms-single-school" },
    update: { name: "SchoolMS Demo School" },
    create: { id: "schoolms-single-school", name: "SchoolMS Demo School" },
  });

  const adminPassword = await hashPassword("AdminPass123");
  const teacherPassword = await hashPassword("TeacherPass123");

  const adminUser = await db.user.upsert({
    where: { email: "admin@schoolms.local" },
    update: { passwordHash: adminPassword, role: Role.ADMIN },
    create: { email: "admin@schoolms.local", passwordHash: adminPassword, role: Role.ADMIN },
  });

  const teacherUser = await db.user.upsert({
    where: { email: "teacher@schoolms.local" },
    update: { passwordHash: teacherPassword, role: Role.TEACHER },
    create: { email: "teacher@schoolms.local", passwordHash: teacherPassword, role: Role.TEACHER },
  });

  const year = await db.academicYear.upsert({
    where: { name: "2026" },
    update: {
      startDate: new Date("2026-01-05"),
      endDate: new Date("2026-12-04"),
      isActive: true,
    },
    create: {
      name: "2026",
      startDate: new Date("2026-01-05"),
      endDate: new Date("2026-12-04"),
      isActive: true,
    },
  });

  const term = await db.term.upsert({
    where: {
      academicYearId_name: {
        academicYearId: year.id,
        name: "Term 1",
      },
    },
    update: {
      startDate: new Date("2026-01-05"),
      endDate: new Date("2026-04-10"),
      isActive: true,
    },
    create: {
      academicYearId: year.id,
      name: "Term 1",
      startDate: new Date("2026-01-05"),
      endDate: new Date("2026-04-10"),
      isActive: true,
    },
  });

  const classSeven = await db.class.upsert({
    where: { level: 7 },
    update: { name: "Grade 7", hasStreams: true },
    create: { name: "Grade 7", level: 7, hasStreams: true },
  });

  const classEight = await db.class.upsert({
    where: { level: 8 },
    update: { name: "Grade 8", hasStreams: true, nextClassId: null },
    create: { name: "Grade 8", level: 8, hasStreams: true },
  });

  await db.class.update({
    where: { id: classSeven.id },
    data: { nextClassId: classEight.id },
  });

  const streamNorth = await db.stream.upsert({
    where: { classId_name: { classId: classSeven.id, name: "North" } },
    update: { isDefault: true },
    create: { classId: classSeven.id, name: "North", isDefault: true },
  });

  const streamEast = await db.stream.upsert({
    where: { classId_name: { classId: classEight.id, name: "East" } },
    update: { isDefault: true },
    create: { classId: classEight.id, name: "East", isDefault: true },
  });

  await db.streamPromotionMap.upsert({
    where: { fromStreamId: streamNorth.id },
    update: { toStreamId: streamEast.id },
    create: { fromStreamId: streamNorth.id, toStreamId: streamEast.id },
  });

  const math = await db.subject.upsert({
    where: { code: "MATH" },
    update: { name: "Mathematics" },
    create: { code: "MATH", name: "Mathematics" },
  });
  const english = await db.subject.upsert({
    where: { code: "ENG" },
    update: { name: "English" },
    create: { code: "ENG", name: "English" },
  });

  await db.classSubject.upsert({
    where: { classId_subjectId: { classId: classSeven.id, subjectId: math.id } },
    update: {},
    create: { classId: classSeven.id, subjectId: math.id },
  });
  await db.classSubject.upsert({
    where: { classId_subjectId: { classId: classSeven.id, subjectId: english.id } },
    update: {},
    create: { classId: classSeven.id, subjectId: english.id },
  });
  await db.classSubject.upsert({
    where: { classId_subjectId: { classId: classEight.id, subjectId: math.id } },
    update: {},
    create: { classId: classEight.id, subjectId: math.id },
  });

  const teacher = await db.teacher.upsert({
    where: { userId: teacherUser.id },
    update: { employeeNumber: "T-001", firstName: "Jane", lastName: "Mwangi" },
    create: {
      userId: teacherUser.id,
      employeeNumber: "T-001",
      firstName: "Jane",
      lastName: "Mwangi",
    },
  });

  await db.teacherStreamSubject.upsert({
    where: {
      teacherId_streamId_subjectId: {
        teacherId: teacher.id,
        streamId: streamNorth.id,
        subjectId: math.id,
      },
    },
    update: {},
    create: { teacherId: teacher.id, streamId: streamNorth.id, subjectId: math.id },
  });

  await db.classTeacherAssignment.updateMany({
    where: { streamId: streamNorth.id },
    data: { isActive: false, endDate: new Date("2026-01-05") },
  });
  await db.classTeacherAssignment.create({
    data: {
      teacherId: teacher.id,
      streamId: streamNorth.id,
      startDate: new Date("2026-01-05"),
      isActive: true,
    },
  });

  const student = await db.student.upsert({
    where: { admissionNumber: "ADM-001" },
    update: {
      firstName: "Brian",
      lastName: "Otieno",
      gender: Gender.MALE,
      dateOfBirth: new Date("2013-05-02"),
      currentClassId: classSeven.id,
      currentStreamId: streamNorth.id,
      status: StudentStatus.ACTIVE,
    },
    create: {
      admissionNumber: "ADM-001",
      firstName: "Brian",
      lastName: "Otieno",
      gender: Gender.MALE,
      dateOfBirth: new Date("2013-05-02"),
      currentClassId: classSeven.id,
      currentStreamId: streamNorth.id,
      status: StudentStatus.ACTIVE,
    },
  });

  await db.studentStreamHistory.deleteMany({ where: { studentId: student.id } });
  await db.studentStreamHistory.create({
    data: {
      studentId: student.id,
      classId: classSeven.id,
      streamId: streamNorth.id,
      status: StudentStatus.ACTIVE,
      effectiveFrom: new Date("2026-01-05"),
    },
  });

  const exam = await db.exam.upsert({
    where: { termId_name: { termId: term.id, name: "Opener Exam" } },
    update: { startDate: new Date("2026-02-10") },
    create: {
      termId: term.id,
      name: "Opener Exam",
      startDate: new Date("2026-02-10"),
    },
  });

  await db.examConfiguration.createMany({
    data: [
      { examId: exam.id, classId: classSeven.id, subjectId: math.id },
      { examId: exam.id, classId: classSeven.id, subjectId: english.id },
    ],
    skipDuplicates: true,
  });

  console.log({
    adminEmail: adminUser.email,
    teacherEmail: teacherUser.email,
    sampleStudent: student.admissionNumber,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
