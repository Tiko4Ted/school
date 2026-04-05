import supertest from "supertest";
import { Role } from "@prisma/client";
import * as TeachersRoute from "@/app/api/teachers/route";
import * as MarksRoute from "@/app/api/marks/route";
import * as MeritListsRoute from "@/app/api/merit-lists/route";
import * as ReportsRoute from "@/app/api/reports/route";
import { createRouteTestServer } from "../utils/server";
import { resetDatabase } from "../utils/db";
import { seedIntegrationGraph } from "../utils/fixtures";
import { setTestSession } from "../utils/session";

const server = createRouteTestServer({
  "/api/teachers": TeachersRoute,
  "/api/marks": MarksRoute,
  "/api/merit-lists": MeritListsRoute,
  "/api/reports": ReportsRoute,
});

const request = supertest(server);

afterAll(() => {
  server.close();
});

beforeEach(async () => {
  await resetDatabase();
  setTestSession(null);
});

describe("Teachers API", () => {
  it("blocks non-admin users from listing teachers", async () => {
    const { teacherUser } = await seedIntegrationGraph();

    setTestSession({
      user: {
        id: teacherUser.id,
        email: teacherUser.email,
        role: Role.TEACHER,
      },
    });

    const res = await request.get("/api/teachers");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Forbidden");
  });

  it("validates payloads and allows admins to manage teachers", async () => {
    const { adminUser } = await seedIntegrationGraph();

    setTestSession({
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: Role.ADMIN,
      },
    });

    const invalidRes = await request.post("/api/teachers").send({
      email: "not-an-email",
      password: "short",
      employeeNumber: "1",
      firstName: "",
      lastName: "",
    });

    expect(invalidRes.status).toBe(422);
    expect(invalidRes.body.details).toBeDefined();

    const createRes = await request.post("/api/teachers").send({
      email: "new.teacher@schoolms.local",
      password: "Password123!",
      employeeNumber: "EMP-NEW",
      firstName: "New",
      lastName: "Teacher",
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.employeeNumber).toBe("EMP-NEW");

    const listRes = await request.get("/api/teachers");
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Marks API", () => {
  it("lets assigned teachers record marks and prevents cross-stream access", async () => {
    const scenario = await seedIntegrationGraph({ primaryStudents: 2, secondaryStudents: 1 });
    const [studentOne, studentTwo] = scenario.students.primary;
    const otherStreamStudent = scenario.students.secondary[0]!;

    setTestSession({
      user: {
        id: scenario.teacherUser.id,
        email: scenario.teacherUser.email,
        role: Role.TEACHER,
      },
    });

    const okRes = await request.post("/api/marks").send({
      examId: scenario.exam.id,
      studentId: studentOne.id,
      subjectId: scenario.subject.id,
      score: 78,
    });

    expect(okRes.status).toBe(201);

    const secondOkRes = await request.post("/api/marks").send({
      examId: scenario.exam.id,
      studentId: studentTwo.id,
      subjectId: scenario.subject.id,
      score: 88,
    });

    expect(secondOkRes.status).toBe(201);

    const forbiddenRes = await request.post("/api/marks").send({
      examId: scenario.exam.id,
      studentId: otherStreamStudent.id,
      subjectId: scenario.subject.id,
      score: 90,
    });

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error).toMatch(/not assigned/i);
  });

  it("returns structured validation errors for invalid mark payloads", async () => {
    const scenario = await seedIntegrationGraph();

    setTestSession({
      user: {
        id: scenario.adminUser.id,
        email: scenario.adminUser.email,
        role: Role.ADMIN,
      },
    });

    const invalidRes = await request.post("/api/marks").send({
      examId: scenario.exam.id,
      studentId: scenario.students.primary[0]!.id,
      subjectId: scenario.subject.id,
      score: 120,
    });

    expect(invalidRes.status).toBe(422);
    expect(invalidRes.body.details?.fieldErrors?.score ?? invalidRes.body.details).toBeDefined();
  });
});

describe("Merit lists and reports workflow", () => {
  it("generates rankings, publishes reports, and supports remark + reopen actions", async () => {
    const scenario = await seedIntegrationGraph({ primaryStudents: 2, secondaryStudents: 1 });
    const [studentOne, studentTwo] = scenario.students.primary;
    const secondaryStudent = scenario.students.secondary[0]!;

    setTestSession({
      user: {
        id: scenario.teacherUser.id,
        email: scenario.teacherUser.email,
        role: Role.TEACHER,
      },
    });

    await request.post("/api/marks").send({
      examId: scenario.exam.id,
      studentId: studentOne.id,
      subjectId: scenario.subject.id,
      score: 95,
    });

    await request.post("/api/marks").send({
      examId: scenario.exam.id,
      studentId: studentTwo.id,
      subjectId: scenario.subject.id,
      score: 88,
    });

    setTestSession({
      user: {
        id: scenario.adminUser.id,
        email: scenario.adminUser.email,
        role: Role.ADMIN,
      },
    });

    await request.post("/api/marks").send({
      examId: scenario.exam.id,
      studentId: secondaryStudent.id,
      subjectId: scenario.subject.id,
      score: 70,
    });

    const meritRes = await request.post("/api/merit-lists").send({
      examId: scenario.exam.id,
      classId: scenario.schoolClass.id,
    });

    expect(meritRes.status).toBe(201);
    const meritEntries = meritRes.body.data.entries;
    expect(meritEntries.map((entry: any) => entry.classRank)).toEqual([1, 2, 3]);
    const streamRanks = meritEntries
      .filter((entry: any) => entry.streamId === scenario.streams.primary.id)
      .map((entry: any) => entry.streamRank);
    expect(streamRanks).toEqual([1, 2]);

    const reportRes = await request.post("/api/reports").send({
      termId: scenario.term.id,
      classId: scenario.schoolClass.id,
      examIds: [scenario.exam.id],
    });

    expect(reportRes.status).toBe(201);
    expect(reportRes.body.data.status).toBe("PUBLISHED");
    expect(reportRes.body.data.remarks.length).toBeGreaterThan(0);

    const targetRemark = reportRes.body.data.remarks[0];
    const updatedText = "Great progress, maintain consistency.";
    const remarkRes = await request
      .post("/api/reports?action=remark")
      .send({
        reportId: reportRes.body.data.id,
        studentId: targetRemark.studentId,
        remark: updatedText,
        classTeacherName: "Coach Kim",
      });

    expect(remarkRes.status).toBe(200);
    expect(remarkRes.body.data.remark).toBe(updatedText);
    expect(remarkRes.body.data.classTeacherName).toBe("Coach Kim");

    const reopenRes = await request.post("/api/reports?action=reopen").send({
      reportId: reportRes.body.data.id,
    });

    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.data.status).toBe("DRAFT");
  });
});
