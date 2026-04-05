"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type TeacherRecord = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  user: { id: string; email: string };
  streamSubjectAssignments: {
    id: string;
    stream: { id: string; name: string; class: { id: string; name: string } };
    subject: { id: string; name: string; code: string };
  }[];
  classTeacherAssignments: {
    id: string;
    stream: { id: string; name: string; class: { id: string; name: string } };
    startDate: string;
    endDate: string | null;
    isActive: boolean;
  }[];
};

type SetupClass = {
  id: string;
  name: string;
  level: number;
  streams: { id: string; name: string }[];
  classSubjects: { id: string; subject: { id: string; name: string; code: string } }[];
};

type SetupData = {
  classes: SetupClass[];
};

const baseTeacherSchema = z.object({
  email: z.string().trim().email("Valid email is required."),
  employeeNumber: z.string().trim().min(2, "Employee number is required."),
  firstName: z.string().trim().min(2, "First name is required."),
  lastName: z.string().trim().min(2, "Last name is required."),
});

const createTeacherSchema = baseTeacherSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters.").max(72, "Password must not exceed 72 characters."),
});

const editTeacherSchema = baseTeacherSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters.").max(72, "Password must not exceed 72 characters.").optional(),
});

const assignmentSchema = z.object({
  teacherId: z.string().uuid("Select a teacher."),
  classId: z.string().uuid("Select a class."),
  streamId: z.string().uuid("Select a stream."),
  subjectId: z.string().uuid("Select a subject."),
});

const initialTeacherValues = {
  email: "",
  password: "",
  employeeNumber: "",
  firstName: "",
  lastName: "",
};

const initialAssignmentValues = {
  teacherId: "",
  classId: "",
  streamId: "",
  subjectId: "",
};

export function TeachersManager() {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
  const [teachersError, setTeachersError] = useState<string | null>(null);

  const [setup, setSetup] = useState<SetupData | null>(null);
  const [isSetupLoading, setIsSetupLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [teacherValues, setTeacherValues] = useState(initialTeacherValues);
  const [teacherFieldErrors, setTeacherFieldErrors] = useState<Record<string, string>>({});
  const [teacherFormError, setTeacherFormError] = useState<string | null>(null);
  const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);

  const [assignmentValues, setAssignmentValues] = useState(initialAssignmentValues);
  const [assignmentFieldErrors, setAssignmentFieldErrors] = useState<Record<string, string>>({});
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  useEffect(() => {
    void loadTeachers();
    void loadSetupData();
  }, []);

  async function loadTeachers() {
    setIsLoadingTeachers(true);
    setTeachersError(null);

    const response = await fetch("/api/teachers", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { data?: TeacherRecord[]; error?: string } | null;

    if (!response.ok) {
      setTeachersError(payload?.error ?? "Failed to load teachers.");
      setIsLoadingTeachers(false);
      return;
    }

    setTeachers(payload?.data ?? []);
    setIsLoadingTeachers(false);
  }

  async function loadSetupData() {
    setIsSetupLoading(true);
    setSetupError(null);

    const response = await fetch("/api/setup", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { data?: SetupData & Record<string, unknown>; error?: string } | null;

    if (!response.ok) {
      setSetupError(payload?.error ?? "Failed to load class and subject options.");
      setIsSetupLoading(false);
      return;
    }

    setSetup({ classes: payload?.data?.classes ?? [] });
    setIsSetupLoading(false);
  }

  function resetTeacherForm() {
    setFormMode("create");
    setEditingTeacherId(null);
    setTeacherValues(initialTeacherValues);
    setTeacherFieldErrors({});
    setTeacherFormError(null);
  }

  function handleEditTeacher(teacher: TeacherRecord) {
    setFormMode("edit");
    setEditingTeacherId(teacher.id);
    setTeacherValues({
      email: teacher.user.email,
      password: "",
      employeeNumber: teacher.employeeNumber,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
    });
    setTeacherFieldErrors({});
    setTeacherFormError(null);
    setAssignmentValues((current) => ({
      ...current,
      teacherId: teacher.id,
    }));
  }

  async function handleTeacherSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingTeacher(true);
    setTeacherFormError(null);
    setTeacherFieldErrors({});

    const parsedData =
      formMode === "create"
        ? createTeacherSchema.safeParse({
            email: teacherValues.email.trim(),
            password: teacherValues.password,
            employeeNumber: teacherValues.employeeNumber.trim(),
            firstName: teacherValues.firstName.trim(),
            lastName: teacherValues.lastName.trim(),
          })
        : editTeacherSchema.safeParse({
            email: teacherValues.email.trim(),
            password: teacherValues.password.trim() ? teacherValues.password : undefined,
            employeeNumber: teacherValues.employeeNumber.trim(),
            firstName: teacherValues.firstName.trim(),
            lastName: teacherValues.lastName.trim(),
          });

    if (!parsedData.success) {
      const fieldErrors = parsedData.error.flatten().fieldErrors;
      setTeacherFieldErrors({
        email: fieldErrors.email?.[0] ?? "",
        password: fieldErrors.password?.[0] ?? "",
        employeeNumber: fieldErrors.employeeNumber?.[0] ?? "",
        firstName: fieldErrors.firstName?.[0] ?? "",
        lastName: fieldErrors.lastName?.[0] ?? "",
      });
      setIsSubmittingTeacher(false);
      return;
    }

    if (formMode === "edit" && !editingTeacherId) {
      setTeacherFormError("Select a teacher to edit before saving.");
      setIsSubmittingTeacher(false);
      return;
    }

    const endpoint = formMode === "create" ? "/api/teachers" : `/api/teachers/${editingTeacherId}`;
    const method = formMode === "create" ? "POST" : "PATCH";

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedData.data),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setTeacherFormError(payload?.error ?? "Failed to save teacher.");
      setIsSubmittingTeacher(false);
      return;
    }

    await loadTeachers();
    resetTeacherForm();
    setAssignmentValues((current) => ({
      ...current,
      teacherId: formMode === "create" ? "" : current.teacherId,
    }));
    setIsSubmittingTeacher(false);
  }

  function handleAssignmentChange(field: keyof typeof assignmentValues, value: string) {
    setAssignmentValues((current) => {
      if (field === "classId") {
        return { ...current, classId: value, streamId: "", subjectId: "" };
      }
      return { ...current, [field]: value };
    });
    setAssignmentFieldErrors({});
    setAssignmentError(null);
    setAssignmentSuccess(null);
  }

  async function handleAssignmentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingAssignment(true);
    setAssignmentError(null);
    setAssignmentFieldErrors({});
    setAssignmentSuccess(null);

    const parsed = assignmentSchema.safeParse(assignmentValues);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setAssignmentFieldErrors({
        teacherId: errors.teacherId?.[0] ?? "",
        classId: errors.classId?.[0] ?? "",
        streamId: errors.streamId?.[0] ?? "",
        subjectId: errors.subjectId?.[0] ?? "",
      });
      setIsSubmittingAssignment(false);
      return;
    }

    const response = await fetch("/api/teachers?action=assign-stream-subject", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        teacherId: parsed.data.teacherId,
        streamId: parsed.data.streamId,
        subjectId: parsed.data.subjectId,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setAssignmentError(payload?.error ?? "Failed to assign teacher to stream and subject.");
      setIsSubmittingAssignment(false);
      return;
    }

    const assignedTeacher = teachers.find((teacher) => teacher.id === parsed.data.teacherId);
    const selectedClass = setup?.classes.find((cls) => cls.id === parsed.data.classId);
    const selectedStream = selectedClass?.streams.find((stream) => stream.id === parsed.data.streamId);
    const selectedSubject = selectedClass?.classSubjects.find(
      (item) => item.subject.id === parsed.data.subjectId,
    )?.subject;

    setAssignmentSuccess(
      `Assigned ${assignedTeacher ? `${assignedTeacher.firstName} ${assignedTeacher.lastName}` : "teacher"} to ${
        selectedSubject ? selectedSubject.name : "subject"
      } for ${selectedClass ? selectedClass.name : "class"} ${selectedStream ? selectedStream.name : "stream"}.`,
    );

    setAssignmentValues((current) => ({
      ...current,
      streamId: "",
      subjectId: "",
    }));

    await loadTeachers();
    setIsSubmittingAssignment(false);
  }

  const sortedClasses = useMemo(() => {
    if (!setup?.classes) {
      return [];
    }
    return [...setup.classes].sort((a, b) => a.level - b.level);
  }, [setup]);

  const selectedClass = useMemo(
    () => sortedClasses.find((cls) => cls.id === assignmentValues.classId),
    [assignmentValues.classId, sortedClasses],
  );

  const availableStreams = selectedClass?.streams ?? [];
  const availableSubjects = selectedClass?.classSubjects.map((item) => item.subject) ?? [];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-6xl space-y-8">
        <Card className="border-slate-200 bg-white/95">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Teachers</p>
              <CardTitle className="text-3xl">Teacher accounts and assignments</CardTitle>
              <CardDescription className="text-base">
                Create teacher logins, edit directory details, and map stream + subject scopes exactly as allowed in the
                marks workflow.
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={() => {
                void loadTeachers();
              }}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Refresh list
            </button>
          </CardHeader>
          <CardContent>
            {isLoadingTeachers ? <p className="text-sm text-slate-600">Loading teachers...</p> : null}
            {teachersError ? <p className="text-sm text-rose-600">{teachersError}</p> : null}
            {!isLoadingTeachers && !teachersError ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Teacher</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Contact</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Assignments</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {teachers.map((teacher) => {
                      const activeClassTeacher = teacher.classTeacherAssignments.find((assignment) => assignment.isActive);

                      return (
                        <tr key={teacher.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">
                              {teacher.firstName} {teacher.lastName}
                            </p>
                            <p className="text-xs uppercase tracking-wide text-slate-500">#{teacher.employeeNumber}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <p>{teacher.user.email}</p>
                            <p className="text-xs text-slate-500">
                              Active class teacher:{" "}
                              {activeClassTeacher
                                ? `${activeClassTeacher.stream.class.name} ${activeClassTeacher.stream.name}`
                                : "None"}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {teacher.streamSubjectAssignments.length ? (
                              <ul className="space-y-1 text-slate-700">
                                {teacher.streamSubjectAssignments.map((assignment) => (
                                  <li key={assignment.id}>
                                    {assignment.stream.class.name} {assignment.stream.name} · {assignment.subject.name} (
                                    {assignment.subject.code})
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-slate-500">No stream-subject assignments yet.</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleEditTeacher(teacher)}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {teachers.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={4}>
                          No teachers found. Create your first teacher below.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white/95">
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                {formMode === "create" ? "Create Teacher" : "Edit Teacher"}
              </p>
              <CardTitle>{formMode === "create" ? "New teacher profile" : "Update teacher details"}</CardTitle>
              <CardDescription className="text-base">
                {formMode === "create"
                  ? "Provision login credentials and directory information for a teacher."
                  : "Update email, directory data, or reset the password for the selected teacher."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleTeacherSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="teacher-firstName">
                    First name
                  </label>
                  <input
                    id="teacher-firstName"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                    value={teacherValues.firstName}
                    onChange={(event) =>
                      setTeacherValues((current) => ({ ...current, firstName: event.target.value }))
                    }
                  />
                  {teacherFieldErrors.firstName ? (
                    <p className="text-sm text-rose-600">{teacherFieldErrors.firstName}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="teacher-lastName">
                    Last name
                  </label>
                  <input
                    id="teacher-lastName"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                    value={teacherValues.lastName}
                    onChange={(event) => setTeacherValues((current) => ({ ...current, lastName: event.target.value }))}
                  />
                  {teacherFieldErrors.lastName ? (
                    <p className="text-sm text-rose-600">{teacherFieldErrors.lastName}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="teacher-employeeNumber">
                    Employee number
                  </label>
                  <input
                    id="teacher-employeeNumber"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                    value={teacherValues.employeeNumber}
                    onChange={(event) =>
                      setTeacherValues((current) => ({ ...current, employeeNumber: event.target.value }))
                    }
                  />
                  {teacherFieldErrors.employeeNumber ? (
                    <p className="text-sm text-rose-600">{teacherFieldErrors.employeeNumber}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="teacher-email">
                    Email
                  </label>
                  <input
                    id="teacher-email"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                    value={teacherValues.email}
                    onChange={(event) => setTeacherValues((current) => ({ ...current, email: event.target.value }))}
                  />
                  {teacherFieldErrors.email ? <p className="text-sm text-rose-600">{teacherFieldErrors.email}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="teacher-password">
                    {formMode === "create" ? "Temporary password" : "Reset password (optional)"}
                  </label>
                  <input
                    id="teacher-password"
                    type="password"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                    value={teacherValues.password}
                    onChange={(event) => setTeacherValues((current) => ({ ...current, password: event.target.value }))}
                    placeholder={formMode === "edit" ? "Leave blank to keep existing password" : undefined}
                  />
                  {teacherFieldErrors.password ? (
                    <p className="text-sm text-rose-600">{teacherFieldErrors.password}</p>
                  ) : null}
                </div>

                {teacherFormError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {teacherFormError}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isSubmittingTeacher}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmittingTeacher
                      ? "Saving..."
                      : formMode === "create"
                        ? "Create teacher"
                        : "Save changes"}
                  </button>
                  {formMode === "edit" ? (
                    <button
                      type="button"
                      onClick={resetTeacherForm}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                    >
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white/95">
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Assignment</p>
              <CardTitle>Stream + subject scope</CardTitle>
              <CardDescription className="text-base">
                Teachers may only edit marks for the specific stream and subject pairs configured here. Subjects are
                limited to those already linked to the class.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSetupLoading ? <p className="text-sm text-slate-600">Loading class data...</p> : null}
              {setupError ? <p className="text-sm text-rose-600">{setupError}</p> : null}
              <form className="space-y-5" onSubmit={handleAssignmentSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="assignment-teacherId">
                    Teacher
                  </label>
                  <select
                    id="assignment-teacherId"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                    value={assignmentValues.teacherId}
                    onChange={(event) => handleAssignmentChange("teacherId", event.target.value)}
                    disabled={teachers.length === 0}
                  >
                    <option value="">Select teacher</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.firstName} {teacher.lastName} ({teacher.employeeNumber})
                      </option>
                    ))}
                  </select>
                  {assignmentFieldErrors.teacherId ? (
                    <p className="text-sm text-rose-600">{assignmentFieldErrors.teacherId}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="assignment-classId">
                    Class
                  </label>
                  <select
                    id="assignment-classId"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                    value={assignmentValues.classId}
                    onChange={(event) => handleAssignmentChange("classId", event.target.value)}
                    disabled={!sortedClasses.length}
                  >
                    <option value="">Select class</option>
                    {sortedClasses.map((schoolClass) => (
                      <option key={schoolClass.id} value={schoolClass.id}>
                        {schoolClass.name}
                      </option>
                    ))}
                  </select>
                  {assignmentFieldErrors.classId ? (
                    <p className="text-sm text-rose-600">{assignmentFieldErrors.classId}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="assignment-streamId">
                    Stream
                  </label>
                  <select
                    id="assignment-streamId"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                    value={assignmentValues.streamId}
                    onChange={(event) => handleAssignmentChange("streamId", event.target.value)}
                    disabled={!availableStreams.length}
                  >
                    <option value="">Select stream</option>
                    {availableStreams.map((stream) => (
                      <option key={stream.id} value={stream.id}>
                        {stream.name}
                      </option>
                    ))}
                  </select>
                  {assignmentFieldErrors.streamId ? (
                    <p className="text-sm text-rose-600">{assignmentFieldErrors.streamId}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="assignment-subjectId">
                    Subject
                  </label>
                  <select
                    id="assignment-subjectId"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                    value={assignmentValues.subjectId}
                    onChange={(event) => handleAssignmentChange("subjectId", event.target.value)}
                    disabled={!availableSubjects.length}
                  >
                    <option value="">Select subject</option>
                    {availableSubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </option>
                    ))}
                  </select>
                  {assignmentFieldErrors.subjectId ? (
                    <p className="text-sm text-rose-600">{assignmentFieldErrors.subjectId}</p>
                  ) : null}
                </div>

                {assignmentError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {assignmentError}
                  </div>
                ) : null}

                {assignmentSuccess ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {assignmentSuccess}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={
                    isSubmittingAssignment || !teachers.length || !sortedClasses.length || !assignmentValues.teacherId
                  }
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingAssignment ? "Assigning..." : "Assign teacher"}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
