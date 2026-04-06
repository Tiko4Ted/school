"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button, PrimaryButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

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

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
    setIsFormOpen(false);
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
    setIsFormOpen(true);
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

    const endpoint = formMode === "create" ? "/api/teachers" : `/api/teachers/${editingTeacherId}`;
    const method = formMode === "create" ? "POST" : "PATCH";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
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
    setIsSubmittingTeacher(false);
  }

  function handleAssignmentChange(field: keyof typeof assignmentValues, value: string) {
    setAssignmentValues((current) => {
      if (field === "classId") return { ...current, classId: value, streamId: "", subjectId: "" };
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId: parsed.data.teacherId,
        streamId: parsed.data.streamId,
        subjectId: parsed.data.subjectId,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setAssignmentError(payload?.error ?? "Failed to assign teacher.");
      setIsSubmittingAssignment(false);
      return;
    }

    setAssignmentSuccess("Scope assigned successfully.");
    setAssignmentValues((current) => ({ ...current, streamId: "", subjectId: "" }));
    await loadTeachers();
    setIsSubmittingAssignment(false);
  }

  const sortedClasses = useMemo(() => {
    if (!setup?.classes) return [];
    return [...setup.classes].sort((a, b) => a.level - b.level);
  }, [setup]);

  const selectedClass = useMemo(
    () => sortedClasses.find((cls) => cls.id === assignmentValues.classId),
    [assignmentValues.classId, sortedClasses],
  );

  const availableStreams = selectedClass?.streams ?? [];
  const availableSubjects = selectedClass?.classSubjects.map((item) => item.subject) ?? [];

  const teacherStats = useMemo(() => ({
    total: teachers.length,
    activeAssignments: teachers.reduce((acc, t) => acc + t.streamSubjectAssignments.length, 0),
    classTeachers: teachers.filter(t => t.classTeacherAssignments.some(a => a.isActive)).length
  }), [teachers]);

  return (
    <div className="space-y-6 pb-20">
      {/* Analytics */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="border-none shadow-soft bg-primary text-white">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Faculty Count</p>
            <p className="mt-1 text-3xl font-black">{teacherStats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-soft">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary/60">Active Assignments</p>
            <p className="mt-1 text-3xl font-black text-secondary">{teacherStats.activeAssignments}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-soft">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary/60">Class Teacher Roles</p>
            <p className="mt-1 text-3xl font-black text-accent">{teacherStats.classTeachers}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border-subtle bg-background/50 py-6">
          <div className="space-y-1">
            <CardTitle className="text-xl">Staff Directory</CardTitle>
            <CardDescription>Official roster of teaching staff and their departmental scopes.</CardDescription>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => void loadTeachers()} className="font-bold uppercase tracking-widest text-[10px] h-10 px-6">
              Refresh
            </Button>
            <PrimaryButton onClick={() => { resetTeacherForm(); setIsFormOpen(true); }} className="font-bold uppercase tracking-widest text-[10px] h-10 px-6 shadow-soft">
              Add Teacher
            </PrimaryButton>
            <Button variant="outline" onClick={() => setIsAssignOpen(true)} className="font-bold uppercase tracking-widest text-[10px] h-10 px-6 border-secondary text-secondary hover:bg-secondary-light/30">
              Assign Scopes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingTeachers ? (
            <p className="py-20 text-center text-sm font-bold uppercase tracking-widest text-text-secondary animate-pulse">Loading Staff...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-background/80">
                  <TableHead className="py-3">Staff Member</TableHead>
                  <TableHead className="py-3">Contact</TableHead>
                  <TableHead className="py-3">Scope</TableHead>
                  <TableHead className="py-3">Class Role</TableHead>
                  <TableHead className="text-right py-3 pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => {
                  const activeClassTeacher = teacher.classTeacherAssignments.find((a) => a.isActive);
                  return (
                    <TableRow key={teacher.id} className="group hover:bg-primary-light/5 transition-colors">
                      <TableCell className="py-2">
                        <p className="font-extrabold text-text-primary text-[13px]">{teacher.firstName} {teacher.lastName}</p>
                        <span className="text-[9px] font-black uppercase text-text-secondary/40 tracking-tighter">ID: {teacher.employeeNumber}</span>
                      </TableCell>
                      <TableCell className="py-2 text-[11px] font-medium text-text-secondary">{teacher.user.email}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {teacher.streamSubjectAssignments.slice(0, 2).map(a => (
                            <span key={a.id} className="inline-flex rounded bg-background border border-border-subtle px-1.5 py-0.5 text-[9px] font-black text-primary uppercase">
                              {a.stream.class.name} {a.stream.name} · {a.subject.code}
                            </span>
                          ))}
                          {teacher.streamSubjectAssignments.length > 2 && (
                            <span className="text-[9px] font-bold text-text-secondary/40">+{teacher.streamSubjectAssignments.length - 2} more</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {activeClassTeacher ? (
                          <span className="inline-flex rounded bg-secondary-light/50 px-2 py-0.5 text-[9px] font-black uppercase text-secondary">
                            {activeClassTeacher.stream.class.name} {activeClassTeacher.stream.name}
                          </span>
                        ) : <span className="text-[9px] italic text-text-secondary/30">None</span>}
                      </TableCell>
                      <TableCell className="py-2 pr-8 text-right relative">
                        <button onClick={() => setOpenMenuId(openMenuId === teacher.id ? null : teacher.id)} className="rounded-xl p-2 text-text-secondary hover:bg-slate-100"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg></button>
                        {openMenuId === teacher.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-8 top-10 z-30 w-40 rounded-xl border border-border-subtle bg-card p-1 shadow-2xl dark:bg-card-dark text-left">
                              <button onClick={() => { handleEditTeacher(teacher); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase text-text-primary hover:bg-primary-light/50 transition-colors">Edit Profile</button>
                            </div>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Teacher Form Modal */}
      <Dialog isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} size="xl" title={formMode === "create" ? "Add Staff Member" : "Update Staff Profile"}>
        <form className="space-y-8" onSubmit={handleTeacherSubmit}>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Personal Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="First Name" error={teacherFieldErrors.firstName}><Input value={teacherValues.firstName} onChange={e => setTeacherValues(c => ({...c, firstName: e.target.value}))} className="h-10" /></FormField>
                <FormField label="Last Name" error={teacherFieldErrors.lastName}><Input value={teacherValues.lastName} onChange={e => setTeacherValues(c => ({...c, lastName: e.target.value}))} className="h-10" /></FormField>
              </div>
              <FormField label="Employee Number" error={teacherFieldErrors.employeeNumber}><Input value={teacherValues.employeeNumber} onChange={e => setTeacherValues(c => ({...c, employeeNumber: e.target.value}))} className="h-10 font-bold" /></FormField>
            </div>
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Authentication</h3>
              <FormField label="Email Address" error={teacherFieldErrors.email}><Input type="email" value={teacherValues.email} onChange={e => setTeacherValues(c => ({...c, email: e.target.value}))} className="h-10" /></FormField>
              <FormField label={formMode === "create" ? "Initial Password" : "Reset Password"} error={teacherFieldErrors.password}><Input type="password" value={teacherValues.password} onChange={e => setTeacherValues(c => ({...c, password: e.target.value}))} placeholder="Min 8 characters" className="h-10" /></FormField>
            </div>
          </div>
          {teacherFormError && <div className="rounded-xl border border-error/20 bg-error/5 p-3 text-[10px] font-black uppercase text-error tracking-widest">{teacherFormError}</div>}
          <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-6">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="h-10 px-6 font-black uppercase tracking-widest text-[10px]">Cancel</Button>
            <PrimaryButton type="submit" disabled={isSubmittingTeacher} className="h-10 px-10 font-black uppercase tracking-widest text-[10px]">{isSubmittingTeacher ? "Saving..." : "Commit Profile"}</PrimaryButton>
          </div>
        </form>
      </Dialog>

      {/* Assignment Modal */}
      <Dialog isOpen={isAssignOpen} onClose={() => setIsAssignOpen(false)} size="lg" title="Scope Assignment" description="Assign teachers to specific streams and subjects.">
        <form className="space-y-6" onSubmit={handleAssignmentSubmit}>
          <FormField label="Teacher" error={assignmentFieldErrors.teacherId}>
            <Select value={assignmentValues.teacherId} onChange={e => handleAssignmentChange("teacherId", e.target.value)} className="h-11">
              <option value="">Select teacher...</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
            </Select>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Class"><Select value={assignmentValues.classId} onChange={e => handleAssignmentChange("classId", e.target.value)}>{option => null}<option value="">Choose...</option>{sortedClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></FormField>
            <FormField label="Stream"><Select value={assignmentValues.streamId} onChange={e => handleAssignmentChange("streamId", e.target.value)} disabled={!availableStreams.length}><option value="">Choose...</option>{availableStreams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></FormField>
            <FormField label="Subject"><Select value={assignmentValues.subjectId} onChange={e => handleAssignmentChange("subjectId", e.target.value)} disabled={!availableSubjects.length}><option value="">Choose...</option>{availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></FormField>
          </div>
          {assignmentError && <div className="rounded-xl border border-error/20 bg-error/5 p-3 text-[10px] font-black uppercase text-error">{assignmentError}</div>}
          {assignmentSuccess && <div className="rounded-xl border border-secondary/20 bg-secondary-light/30 p-3 text-[10px] font-black uppercase text-secondary">{assignmentSuccess}</div>}
          <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-6">
            <Button type="button" variant="outline" onClick={() => setIsAssignOpen(false)} className="h-10 px-6 font-black uppercase tracking-widest text-[10px]">Close</Button>
            <PrimaryButton type="submit" disabled={isSubmittingAssignment} className="h-10 px-10 font-black uppercase tracking-widest text-[10px]">Confirm Scope</PrimaryButton>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
