import { db } from "@/lib/db";

const TABLES = [
  "StudentRemark",
  "ReportExam",
  "PublishedReport",
  "MeritListSubjectChampion",
  "MeritListEntry",
  "MeritList",
  "MarkReview",
  "Mark",
  "TeacherStreamSubject",
  "ClassTeacherAssignment",
  "StreamPromotionMap",
  "StudentStreamHistory",
  "Student",
  "Teacher",
  "ExamConfiguration",
  "Exam",
  "Term",
  "AcademicYear",
  "ClassSubject",
  "Subject",
  "Stream",
  "Class",
  "School",
  "User",
];

export async function resetDatabase() {
  const tables = TABLES.map((table) => `"${table}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`);
}
