import { Gender, ReportStatus, Role, StudentStatus } from "@prisma/client";
import { z } from "zod";

const id = z.string().uuid();
const dateString = z.coerce.date();
const positiveInt = z.coerce.number().int().positive();
const scoreSchema = z.coerce.number().min(0).max(100);

export const schoolSchema = z.object({
  name: z.string().trim().min(2),
});

export const classSchema = z.object({
  name: z.string().trim().min(1),
  level: positiveInt,
  hasStreams: z.boolean(),
  nextClassId: id.nullish(),
});

export const streamSchema = z.object({
  classId: id,
  name: z.string().trim().min(1),
  isDefault: z.boolean().default(false),
  teacherId: id.optional(),
});

export const subjectSchema = z.object({
  name: z.string().trim().min(2),
  code: z.string().trim().min(2).max(20),
});

export const classSubjectSchema = z.object({
  classId: id,
  subjectId: id,
});

export const academicYearSchema = z.object({
  name: z.string().trim().min(4),
  startDate: dateString,
  endDate: dateString,
  isActive: z.boolean().default(false),
});

export const termSchema = z.object({
  academicYearId: id,
  name: z.string().trim().min(2),
  startDate: dateString,
  endDate: dateString,
  isActive: z.boolean().default(false),
});

export const teacherSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  employeeNumber: z.string().trim().min(2),
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
});

export const teacherUpdateSchema = z
  .object({
    email: z.string().trim().email().optional(),
    password: z.string().min(8).max(72).optional(),
    employeeNumber: z.string().trim().min(2).optional(),
    firstName: z.string().trim().min(2).optional(),
    lastName: z.string().trim().min(2).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  });

export const teacherAssignmentSchema = z.object({
  teacherId: id,
  streamId: id,
  subjectId: id,
});

export const classTeacherAssignmentSchema = z.object({
  teacherId: id,
  streamId: id,
  startDate: dateString,
});

export const studentSchema = z.object({
  admissionNumber: z.string().trim().min(2),
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  gender: z.nativeEnum(Gender),
  dateOfBirth: dateString,
  currentClassId: id,
  currentStreamId: id,
});

export const bulkStudentRowSchema = z.object({
  admissionNumber: z.string().trim().optional(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  gender: z.string().trim().optional(),
  dateOfBirth: z.union([dateString, z.string().trim().min(1)]).optional(),
  classId: z.string().trim().optional(),
  streamId: z.string().trim().optional(),
});

export const bulkStudentCommitSchema = z.object({
  rows: z.array(bulkStudentRowSchema).min(1),
});

export const promoteStudentsSchema = z.object({
  studentIds: z.array(id).min(1),
});

export const transferStudentsSchema = z.object({
  studentIds: z.array(id).min(1),
  destinationSchool: z.string().trim().min(2),
  effectiveDate: dateString,
});

export const graduateStudentsSchema = z.object({
  studentIds: z.array(id).min(1),
  effectiveDate: dateString,
});

export const examSchema = z.object({
  termId: id,
  name: z.string().trim().min(2),
  startDate: dateString,
  endDate: dateString.nullish(),
});

export const examUpdateSchema = z
  .object({
    termId: id.optional(),
    name: z.string().trim().min(2).optional(),
    startDate: dateString.optional(),
    endDate: dateString.nullish().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    { message: "End date must be after start date" },
  );

export const examConfigurationSchema = z.object({
  examId: id,
  classId: id,
  subjectIds: z.array(id).min(1),
});

export const markSchema = z.object({
  examId: id,
  studentId: id,
  subjectId: id,
  score: scoreSchema,
});

export const marksBulkSchema = z.object({
  examId: id,
  streamId: id,
  subjectId: id,
  rows: z
    .array(
      z.object({
        studentId: id,
        score: scoreSchema,
      }),
    )
    .min(1),
});

export const markReviewSchema = z.object({
  examId: id,
  streamId: id,
  subjectId: id,
});

export const meritListGenerateSchema = z.object({
  examId: id,
  classId: id,
});

export const reportSchema = z.object({
  termId: id,
  classId: id,
  examIds: z.array(id).min(1).max(3),
});

export const reportRemarkSchema = z.object({
  reportId: id,
  studentId: id,
  remark: z.string().trim().min(3),
  classTeacherName: z.string().trim().min(2).optional(),
});

export const reportStatusSchema = z.object({
  status: z.nativeEnum(ReportStatus),
});

export const userRoleSchema = z.nativeEnum(Role);
export const studentStatusSchema = z.nativeEnum(StudentStatus);
