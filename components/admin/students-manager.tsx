"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type StudentStatus = "ACTIVE" | "PROMOTED" | "GRADUATED" | "TRANSFERRED";
type Gender = "MALE" | "FEMALE";

type StudentRecord = {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  status: StudentStatus;
  currentClass: { id: string; name: string };
  currentStream: { id: string; name: string };
};

type SetupClass = {
  id: string;
  name: string;
  level: number;
  streams: { id: string; name: string }[];
};

type BulkRow = {
  admissionNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  classId: string;
  streamId?: string;
};

type BulkPreviewRow = {
  index: number;
  admissionNumber: string;
  classId: string;
  streamId: string | null;
  issues: string[];
  exists: boolean;
};

const genderOptions: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

const studentFormSchema = z.object({
  admissionNumber: z.string().trim().min(2, "Admission number is required."),
  firstName: z.string().trim().min(2, "First name is required."),
  lastName: z.string().trim().min(2, "Last name is required."),
  gender: z.enum(["MALE", "FEMALE"], { error: "Gender is required." }),
  dateOfBirth: z.string().trim().min(1, "Date of birth is required."),
  currentClassId: z.string().uuid("Select a class."),
  currentStreamId: z.string().uuid("Select a stream."),
});

const bulkUploadSchema = z.object({
  rows: z.array(
    z.object({
      admissionNumber: z.string().trim().min(2),
      firstName: z.string().trim().min(2),
      lastName: z.string().trim().min(2),
      gender: z.string().trim().min(1),
      dateOfBirth: z.string().trim().min(1),
      classId: z.string().uuid(),
      streamId: z.string().uuid().optional(),
    }),
  ),
});

function formatDateForInput(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
}

export function StudentsManager() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(true);

  const [classes, setClasses] = useState<SetupClass[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentValues, setStudentValues] = useState({
    admissionNumber: "",
    firstName: "",
    lastName: "",
    gender: "" as "" | Gender,
    dateOfBirth: "",
    currentClassId: "",
    currentStreamId: "",
  });
  const [studentFieldErrors, setStudentFieldErrors] = useState<Record<string, string>>({});
  const [studentFormError, setStudentFormError] = useState<string | null>(null);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const [bulkPreview, setBulkPreview] = useState<{ valid: boolean; rows: BulkPreviewRow[] } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  useEffect(() => {
    void loadStudents();
  }, [includeInactive]);

  useEffect(() => {
    void loadSetupData();
  }, []);

  async function loadStudents() {
    setIsLoadingStudents(true);
    setStudentsError(null);
    const response = await fetch(`/api/students?includeInactive=${includeInactive ? "true" : "false"}`, {
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as { data?: StudentRecord[]; error?: string } | null;

    if (!response.ok) {
      setStudentsError(payload?.error ?? "Failed to load students.");
      setIsLoadingStudents(false);
      return;
    }

    setStudents(payload?.data ?? []);
    setIsLoadingStudents(false);
  }

  async function loadSetupData() {
    const response = await fetch("/api/setup", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as
      | { data?: { classes?: SetupClass[] }; error?: string }
      | null;

    if (!response.ok) {
      setSetupError(payload?.error ?? "Failed to load class list.");
      return;
    }

    setClasses(payload?.data?.classes ?? []);
  }

  function resetStudentForm() {
    setFormMode("create");
    setEditingStudentId(null);
    setStudentValues({
      admissionNumber: "",
      firstName: "",
      lastName: "",
      gender: "",
      dateOfBirth: "",
      currentClassId: "",
      currentStreamId: "",
    });
    setStudentFieldErrors({});
    setStudentFormError(null);
  }

  function handleEditStudent(student: StudentRecord) {
    setFormMode("edit");
    setEditingStudentId(student.id);
    setStudentValues({
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      dateOfBirth: formatDateForInput(student.dateOfBirth),
      currentClassId: student.currentClass.id,
      currentStreamId: student.currentStream.id,
    });
    setStudentFieldErrors({});
    setStudentFormError(null);
  }

  const availableStreams = useMemo(() => {
    const selectedClass = classes.find((cls) => cls.id === studentValues.currentClassId);
    return selectedClass?.streams ?? [];
  }, [classes, studentValues.currentClassId]);

  async function handleStudentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingStudent(true);
    setStudentFieldErrors({});
    setStudentFormError(null);

    const parsed = studentFormSchema.safeParse(studentValues);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setStudentFieldErrors({
        admissionNumber: fieldErrors.admissionNumber?.[0] ?? "",
        firstName: fieldErrors.firstName?.[0] ?? "",
        lastName: fieldErrors.lastName?.[0] ?? "",
        gender: fieldErrors.gender?.[0] ?? "",
        dateOfBirth: fieldErrors.dateOfBirth?.[0] ?? "",
        currentClassId: fieldErrors.currentClassId?.[0] ?? "",
        currentStreamId: fieldErrors.currentStreamId?.[0] ?? "",
      });
      setIsSubmittingStudent(false);
      return;
    }

    const payload = {
      ...parsed.data,
      dateOfBirth: parsed.data.dateOfBirth,
    };

    const endpoint = formMode === "create" ? "/api/students" : `/api/students/${editingStudentId}`;
    const method = formMode === "create" ? "POST" : "PATCH";

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setStudentFormError(json?.error ?? "Failed to save student.");
      setIsSubmittingStudent(false);
      return;
    }

    await loadStudents();
    resetStudentForm();
    setIsSubmittingStudent(false);
  }

  async function handleBulkFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setBulkRows([]);
    setBulkPreview(null);
    setBulkError(null);
    setBulkSuccess(null);

    if (!file) {
      setBulkFileName(null);
      return;
    }

    try {
      const rows = await parseUploadFile(file);
      const parsed = bulkUploadSchema.safeParse({ rows });
      if (!parsed.success) {
        setBulkError("Parsed data is missing required columns. Ensure headers match the template.");
        setBulkFileName(file.name);
        return;
      }
      setBulkRows(parsed.data.rows);
      setBulkFileName(file.name);
    } catch (error) {
      console.error(error);
      setBulkError("Failed to parse file. Only CSV or XLSX formats are supported.");
      setBulkFileName(file.name);
    }
  }

  async function handleBulkPreview() {
    if (!bulkRows.length) {
      setBulkError("Load a CSV or XLSX file before previewing.");
      return;
    }

    setIsPreviewing(true);
    setBulkError(null);
    setBulkSuccess(null);

    const response = await fetch("/api/students?action=bulk-preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rows: bulkRows }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { data?: { valid: boolean; rows: BulkPreviewRow[] }; error?: string }
      | null;

    if (!response.ok) {
      setBulkError(payload?.error ?? "Bulk preview failed.");
      setIsPreviewing(false);
      return;
    }

    setBulkPreview(payload?.data ?? null);
    setIsPreviewing(false);
  }

  async function handleBulkCommit() {
    if (!bulkRows.length) {
      setBulkError("Load a CSV or XLSX file before committing.");
      return;
    }

    setIsCommitting(true);
    setBulkError(null);

    const response = await fetch("/api/students?action=bulk-commit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rows: bulkRows }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setBulkError(payload?.error ?? "Bulk commit failed.");
      setIsCommitting(false);
      return;
    }

    setBulkSuccess("Bulk upload committed successfully.");
    setBulkPreview(null);
    setBulkRows([]);
    setBulkFileName(null);
    await loadStudents();
    setIsCommitting(false);
  }

  function renderBulkPreviewTable() {
    if (!bulkRows.length) {
      return null;
    }

    const previewSlice = bulkRows.slice(0, 10);
    return (
      <div className="rounded-2xl border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
          Local preview (showing {previewSlice.length} of {bulkRows.length} rows)
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-slate-600">Admission #</th>
                <th className="px-3 py-2 text-left text-slate-600">Name</th>
                <th className="px-3 py-2 text-left text-slate-600">Gender</th>
                <th className="px-3 py-2 text-left text-slate-600">DOB</th>
                <th className="px-3 py-2 text-left text-slate-600">Class</th>
                <th className="px-3 py-2 text-left text-slate-600">Stream</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {previewSlice.map((row) => (
                <tr key={`${row.admissionNumber}-${row.classId}`}>
                  <td className="px-3 py-2 text-slate-900">{row.admissionNumber}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {row.firstName} {row.lastName}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.gender}</td>
                  <td className="px-3 py-2 text-slate-700">{row.dateOfBirth}</td>
                  <td className="px-3 py-2 text-slate-700">{row.classId}</td>
                  <td className="px-3 py-2 text-slate-700">{row.streamId ?? "auto"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef2ff_0%,#f8fafc_42%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-6xl space-y-8">
        <Card className="border-slate-200 bg-white/95">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600">Students</p>
              <CardTitle className="text-3xl">Directory and enrollment</CardTitle>
              <CardDescription className="text-base">
                Manage admission data, keep class placements accurate, and control student lifecycle actions.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 text-sm text-slate-600 md:items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(event) => setIncludeInactive(event.target.checked)}
                />
                Include promoted/inactive
              </label>
              <button
                type="button"
                onClick={() => void loadStudents()}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                Refresh list
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingStudents ? <p className="text-sm text-slate-600">Loading students...</p> : null}
            {studentsError ? <p className="text-sm text-rose-600">{studentsError}</p> : null}
            {!isLoadingStudents && !studentsError ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Admission</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Gender</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">DOB</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Class / Stream</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{student.admissionNumber}</td>
                        <td className="px-4 py-3 text-slate-900">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{student.gender === "MALE" ? "Male" : "Female"}</td>
                        <td className="px-4 py-3 text-slate-700">{formatDateForInput(student.dateOfBirth)}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {student.currentClass.name} · {student.currentStream.name}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{student.status}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleEditStudent(student)}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={7}>
                          No students found.
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600">
                {formMode === "create" ? "Add student" : "Edit student"}
              </p>
              <CardTitle>{formMode === "create" ? "New admission" : "Update student details"}</CardTitle>
              <CardDescription className="text-base">
                Capture official biodata, assign class + stream, and keep lifecycle transitions consistent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleStudentSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="student-admissionNumber">
                    Admission number
                  </label>
                  <input
                    id="student-admissionNumber"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
                    value={studentValues.admissionNumber}
                    onChange={(event) =>
                      setStudentValues((current) => ({ ...current, admissionNumber: event.target.value }))
                    }
                  />
                  {studentFieldErrors.admissionNumber ? (
                    <p className="text-sm text-rose-600">{studentFieldErrors.admissionNumber}</p>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="student-firstName">
                      First name
                    </label>
                    <input
                      id="student-firstName"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
                      value={studentValues.firstName}
                      onChange={(event) =>
                        setStudentValues((current) => ({ ...current, firstName: event.target.value }))
                      }
                    />
                    {studentFieldErrors.firstName ? (
                      <p className="text-sm text-rose-600">{studentFieldErrors.firstName}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="student-lastName">
                      Last name
                    </label>
                    <input
                      id="student-lastName"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
                      value={studentValues.lastName}
                      onChange={(event) =>
                        setStudentValues((current) => ({ ...current, lastName: event.target.value }))
                      }
                    />
                    {studentFieldErrors.lastName ? (
                      <p className="text-sm text-rose-600">{studentFieldErrors.lastName}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="student-gender">
                      Gender
                    </label>
                    <select
                      id="student-gender"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
                      value={studentValues.gender}
                      onChange={(event) =>
                        setStudentValues((current) => ({
                          ...current,
                          gender: event.target.value as Gender,
                        }))
                      }
                    >
                      <option value="">Select gender</option>
                      {genderOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {studentFieldErrors.gender ? (
                      <p className="text-sm text-rose-600">{studentFieldErrors.gender}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="student-dob">
                      Date of birth
                    </label>
                    <input
                      id="student-dob"
                      type="date"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
                      value={studentValues.dateOfBirth}
                      onChange={(event) =>
                        setStudentValues((current) => ({ ...current, dateOfBirth: event.target.value }))
                      }
                    />
                    {studentFieldErrors.dateOfBirth ? (
                      <p className="text-sm text-rose-600">{studentFieldErrors.dateOfBirth}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="student-class">
                    Class
                  </label>
                  <select
                    id="student-class"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
                    value={studentValues.currentClassId}
                    onChange={(event) =>
                      setStudentValues((current) => ({
                        ...current,
                        currentClassId: event.target.value,
                        currentStreamId: "",
                      }))
                    }
                  >
                    <option value="">Select class</option>
                    {classes
                      .slice()
                      .sort((a, b) => a.level - b.level)
                      .map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                  </select>
                  {studentFieldErrors.currentClassId ? (
                    <p className="text-sm text-rose-600">{studentFieldErrors.currentClassId}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="student-stream">
                    Stream
                  </label>
                  <select
                    id="student-stream"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
                    value={studentValues.currentStreamId}
                    onChange={(event) =>
                      setStudentValues((current) => ({ ...current, currentStreamId: event.target.value }))
                    }
                    disabled={!availableStreams.length}
                  >
                    <option value="">Select stream</option>
                    {availableStreams.map((stream) => (
                      <option key={stream.id} value={stream.id}>
                        {stream.name}
                      </option>
                    ))}
                  </select>
                  {studentFieldErrors.currentStreamId ? (
                    <p className="text-sm text-rose-600">{studentFieldErrors.currentStreamId}</p>
                  ) : null}
                </div>

                {studentFormError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {studentFormError}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isSubmittingStudent}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmittingStudent
                      ? "Saving..."
                      : formMode === "create"
                        ? "Add student"
                        : "Save changes"}
                  </button>
                  {formMode === "edit" ? (
                    <button
                      type="button"
                      onClick={resetStudentForm}
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600">Bulk upload</p>
              <CardTitle>CSV/XLSX import</CardTitle>
              <CardDescription className="text-base">
                Upload admissions from Excel or CSV, preview validation issues, and commit clean rows without touching
                the database manually.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="bulk-file">
                  File (CSV or XLSX with headers: admissionNumber, firstName, lastName, gender, dateOfBirth, classId,
                  streamId?)
                </label>
                <input
                  id="bulk-file"
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleBulkFileChange}
                />
                {bulkFileName ? (
                  <p className="text-xs text-slate-500">Loaded file: {bulkFileName}</p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Provide classId/streamId values from setup exports to avoid mismatches.
                  </p>
                )}
              </div>

              {renderBulkPreviewTable()}

              {bulkError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {bulkError}
                </div>
              ) : null}

              {bulkSuccess ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {bulkSuccess}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleBulkPreview()}
                  disabled={!bulkRows.length || isPreviewing}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPreviewing ? "Validating..." : "Preview & validate"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleBulkCommit()}
                  disabled={!bulkRows.length || isCommitting}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCommitting ? "Submitting..." : "Commit rows"}
                </button>
              </div>


              {bulkPreview ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Validation result:{" "}
                    <span className={bulkPreview.valid ? "text-emerald-600" : "text-rose-600"}>
                      {bulkPreview.valid ? "All rows valid" : "Issues detected"}
                    </span>
                  </p>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-slate-600">Row</th>
                          <th className="px-3 py-2 text-left text-slate-600">Admission</th>
                          <th className="px-3 py-2 text-left text-slate-600">Class ID</th>
                          <th className="px-3 py-2 text-left text-slate-600">Stream ID</th>
                          <th className="px-3 py-2 text-left text-slate-600">Existing?</th>
                          <th className="px-3 py-2 text-left text-slate-600">Issues</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {bulkPreview.rows.map((row) => (
                          <tr key={row.index}>
                            <td className="px-3 py-2 text-slate-700">{row.index + 1}</td>
                            <td className="px-3 py-2 text-slate-700">{row.admissionNumber}</td>
                            <td className="px-3 py-2 text-slate-700">{row.classId}</td>
                            <td className="px-3 py-2 text-slate-700">{row.streamId ?? "auto"}</td>
                            <td className="px-3 py-2 text-slate-700">{row.exists ? "Yes" : "No"}</td>
                            <td className="px-3 py-2 text-slate-700">
                              {row.issues.length ? (
                                <ul className="list-disc pl-4">
                                  {row.issues.map((issue) => (
                                    <li key={issue}>{issue}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-emerald-600">OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {setupError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {setupError}
          </div>
        ) : null}
      </section>
    </main>
  );
}

async function parseUploadFile(file: File): Promise<BulkRow[]> {
  if (file.name.toLowerCase().endsWith(".csv")) {
    return parseCsv(await file.text());
  }

  if (file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")) {
    return parseXlsx(await file.arrayBuffer());
  }

  throw new Error("Unsupported file type");
}

function parseCsv(content: string): BulkRow[] {
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length) {
    throw new Error("CSV parse error");
  }

  return normalizeBulkRows(result.data as Record<string, string>[]);
}

function parseXlsx(buffer: ArrayBuffer): BulkRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: "" });
  return normalizeBulkRows(rows);
}

function normalizeBulkRows(rows: Record<string, string>[]): BulkRow[] {
  return rows
    .map((row) => ({
      admissionNumber: String(row.admissionNumber ?? "").trim(),
      firstName: String(row.firstName ?? "").trim(),
      lastName: String(row.lastName ?? "").trim(),
      gender: String(row.gender ?? "").trim(),
      dateOfBirth: String(row.dateOfBirth ?? "").trim(),
      classId: String(row.classId ?? "").trim(),
      streamId: row.streamId ? String(row.streamId).trim() : undefined,
    }))
    .filter((row) => row.admissionNumber && row.firstName && row.lastName && row.gender && row.dateOfBirth && row.classId);
}
