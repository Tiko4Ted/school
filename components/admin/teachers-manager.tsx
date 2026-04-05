"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button, PrimaryButton } from "@/components/ui/button";

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
      } for ${selectedClass ? selectedClass.name : "class"} ${selectedStream ? selectedStream.name : "stream"}.`
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
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle>Teacher Management</CardTitle>
            <CardDescription>
              Manage teacher accounts, contact details, and their stream + subject assignments.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => void loadTeachers()}>
            Refresh List
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingTeachers ? (
            <div className="p-8 text-center text-sm text-text-secondary">Loading teachers...</div>
          ) : null}
          {teachersError ? (
            <div className="p-8 text-center text-sm font-medium text-error">{teachersError}</div>
          ) : null}
          {!isLoadingTeachers && !teachersError ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Contact & Role</TableHead>
                  <TableHead>Assigned Subjects</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => {
                  const activeClassTeacher = teacher.classTeacherAssignments.find((assignment) => assignment.isActive);

                  return (
                    <TableRow key={teacher.id}>
                      <TableCell>
                        <p className="font-semibold text-text-primary dark:text-text-primary-dark">
                          {teacher.firstName} {teacher.lastName}
                        </p>
                        <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-text-secondary-dark">
                          ID: {teacher.employeeNumber}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-text-secondary dark:text-text-secondary-dark">{teacher.user.email}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">Class Teacher:</span>
                          {activeClassTeacher ? (
                            <span className="inline-flex items-center rounded-lg bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary">
                              {activeClassTeacher.stream.class.name} {activeClassTeacher.stream.name}
                            </span>
                          ) : (
                            <span className="text-xs italic text-text-secondary/60">Unassigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {teacher.streamSubjectAssignments.length ? (
                          <div className="flex flex-wrap gap-2">
                            {teacher.streamSubjectAssignments.map((assignment) => (
                              <span
                                key={assignment.id}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-background px-2.5 py-1 text-xs font-medium text-text-primary dark:border-border-dark dark:bg-background-dark dark:text-text-primary-dark"
                              >
                                <strong className="font-bold text-primary">
                                  {assignment.stream.class.name} {assignment.stream.name}
                                </strong>
                                <span className="text-border-subtle dark:text-border-dark">|</span>
                                {assignment.subject.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs italic text-text-secondary/60">No subject assignments.</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" onClick={() => handleEditTeacher(teacher)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {teachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-text-secondary">
                      No teachers found. Use the form below to add a teacher.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle>
                {formMode === "create" ? "New Teacher Details" : "Update Teacher Details"}
              </CardTitle>
              <CardDescription>
                {formMode === "create"
                  ? "Enter personal information and create login credentials."
                  : "Modify directory details or reset password."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleTeacherSubmit}>
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField label="First Name" id="teacher-firstName" error={teacherFieldErrors.firstName}>
                    <Input
                      id="teacher-firstName"
                      placeholder="Jane"
                      value={teacherValues.firstName}
                      onChange={(event) =>
                        setTeacherValues((current) => ({ ...current, firstName: event.target.value }))
                      }
                    />
                  </FormField>

                  <FormField label="Last Name" id="teacher-lastName" error={teacherFieldErrors.lastName}>
                    <Input
                      id="teacher-lastName"
                      placeholder="Doe"
                      value={teacherValues.lastName}
                      onChange={(event) =>
                        setTeacherValues((current) => ({ ...current, lastName: event.target.value }))
                      }
                    />
                  </FormField>
                </div>

                <FormField label="Employee ID" id="teacher-employeeNumber" error={teacherFieldErrors.employeeNumber}>
                  <Input
                    id="teacher-employeeNumber"
                    placeholder="EMP-001"
                    value={teacherValues.employeeNumber}
                    onChange={(event) =>
                      setTeacherValues((current) => ({ ...current, employeeNumber: event.target.value }))
                    }
                  />
                </FormField>

                <FormField label="Email Address" id="teacher-email" error={teacherFieldErrors.email}>
                  <Input
                    id="teacher-email"
                    type="email"
                    placeholder="jane.doe@school.edu"
                    value={teacherValues.email}
                    onChange={(event) => setTeacherValues((current) => ({ ...current, email: event.target.value }))}
                  />
                </FormField>

                <FormField 
                  label={formMode === "create" ? "Initial Password" : "Reset Password"} 
                  id="teacher-password" 
                  error={teacherFieldErrors.password}
                >
                  <Input
                    id="teacher-password"
                    type="password"
                    value={teacherValues.password}
                    onChange={(event) => setTeacherValues((current) => ({ ...current, password: event.target.value }))}
                    placeholder={formMode === "edit" ? "Leave blank to keep existing" : "Minimum 8 characters"}
                  />
                </FormField>

                {teacherFormError ? (
                  <div className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm font-medium text-error">
                    {teacherFormError}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  <PrimaryButton type="submit" disabled={isSubmittingTeacher}>
                    {isSubmittingTeacher ? "Saving..." : formMode === "create" ? "Create Teacher" : "Save Changes"}
                  </PrimaryButton>
                  {formMode === "edit" ? (
                    <Button type="button" variant="outline" onClick={resetTeacherForm}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>Stream & Subject Scope</CardTitle>
              <CardDescription>
                Assign teachers to specific streams and subjects for mark entry.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSetupLoading ? (
                <div className="pb-4 text-sm text-text-secondary">Loading class data...</div>
              ) : null}
              {setupError ? (
                <div className="pb-4 text-sm font-medium text-error">{setupError}</div>
              ) : null}

              <form className="space-y-5" onSubmit={handleAssignmentSubmit}>
                <FormField label="Teacher" id="assignment-teacherId" error={assignmentFieldErrors.teacherId}>
                  <Select
                    id="assignment-teacherId"
                    value={assignmentValues.teacherId}
                    onChange={(event) => handleAssignmentChange("teacherId", event.target.value)}
                    disabled={teachers.length === 0}
                  >
                    <option value="">Select a teacher...</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.firstName} {teacher.lastName} ({teacher.employeeNumber})
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Class" id="assignment-classId" error={assignmentFieldErrors.classId}>
                  <Select
                    id="assignment-classId"
                    value={assignmentValues.classId}
                    onChange={(event) => handleAssignmentChange("classId", event.target.value)}
                    disabled={!sortedClasses.length}
                  >
                    <option value="">Select a class...</option>
                    {sortedClasses.map((schoolClass) => (
                      <option key={schoolClass.id} value={schoolClass.id}>
                        {schoolClass.name}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <div className="grid gap-5">
                  <FormField label="Stream" id="assignment-streamId" error={assignmentFieldErrors.streamId}>
                    <Select
                      id="assignment-streamId"
                      value={assignmentValues.streamId}
                      onChange={(event) => handleAssignmentChange("streamId", event.target.value)}
                      disabled={!availableStreams.length}
                    >
                      <option value="">Select a stream...</option>
                      {availableStreams.map((stream) => (
                        <option key={stream.id} value={stream.id}>
                          {stream.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField label="Subject" id="assignment-subjectId" error={assignmentFieldErrors.subjectId}>
                    <Select
                      id="assignment-subjectId"
                      value={assignmentValues.subjectId}
                      onChange={(event) => handleAssignmentChange("subjectId", event.target.value)}
                      disabled={!availableSubjects.length}
                    >
                      <option value="">Select a subject...</option>
                      {availableSubjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>

                {assignmentError ? (
                  <div className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm font-medium text-error">
                    {assignmentError}
                  </div>
                ) : null}

                {assignmentSuccess ? (
                  <div className="rounded-xl border border-secondary/20 bg-secondary-light/30 p-4 text-sm font-medium text-secondary">
                    {assignmentSuccess}
                  </div>
                ) : null}

                <div className="pt-2">
                  <PrimaryButton
                    type="submit"
                    className="w-full"
                    disabled={
                      isSubmittingAssignment || !teachers.length || !sortedClasses.length || !assignmentValues.teacherId || !assignmentValues.streamId || !assignmentValues.subjectId
                    }
                  >
                    {isSubmittingAssignment ? "Assigning Scope..." : "Assign Scope"}
                  </PrimaryButton>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
