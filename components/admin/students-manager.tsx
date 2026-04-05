"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button, PrimaryButton } from "@/components/ui/button";

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
  gender: z.enum(["MALE", "FEMALE"], { message: "Gender is required." }),
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
    
    // Reset file input
    const fileInput = document.getElementById("bulk-file") as HTMLInputElement;
    if (fileInput) fileInput.value = "";

    await loadStudents();
    setIsCommitting(false);
  }

  function renderBulkPreviewTable() {
    if (!bulkRows.length) {
      return null;
    }

    const previewSlice = bulkRows.slice(0, 10);
    return (
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-sm">Local Preview (showing {previewSlice.length} of {bulkRows.length} rows)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admission #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>DOB</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Stream</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewSlice.map((row) => (
                <TableRow key={`${row.admissionNumber}-${row.classId}`}>
                  <TableCell className="font-medium text-text-primary">{row.admissionNumber}</TableCell>
                  <TableCell>
                    {row.firstName} {row.lastName}
                  </TableCell>
                  <TableCell>{row.gender}</TableCell>
                  <TableCell>{row.dateOfBirth}</TableCell>
                  <TableCell>{row.classId}</TableCell>
                  <TableCell>{row.streamId ?? "auto"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Directory Section */}
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle>Students Directory</CardTitle>
            <CardDescription>
              Manage admission data, keep class placements accurate, and control student lifecycle actions.
            </CardDescription>
          </div>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
                className="h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-text-secondary">Include inactive</span>
            </label>
            <Button variant="outline" onClick={() => void loadStudents()}>
              Refresh List
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingStudents ? (
            <p className="py-12 text-center text-sm text-text-secondary animate-pulse">Loading students...</p>
          ) : studentsError ? (
            <p className="py-12 text-center text-sm font-medium text-error">{studentsError}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admission</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Gender & DOB</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-bold text-text-primary">{student.admissionNumber}</TableCell>
                    <TableCell className="font-medium text-text-primary">
                      {student.firstName} {student.lastName}
                    </TableCell>
                    <TableCell>
                      <p className="text-text-primary">{student.gender === "MALE" ? "Male" : "Female"}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{formatDateForInput(student.dateOfBirth)}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary">{student.currentClass.name}</span>
                        <span className="h-4 w-px bg-border-subtle" />
                        <span className="text-text-secondary">{student.currentStream.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        student.status === 'ACTIVE' ? 'bg-success/10 text-success' :
                        student.status === 'PROMOTED' ? 'bg-primary/10 text-primary' :
                        'bg-background text-text-secondary border border-border-subtle'
                      }`}>
                        {student.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEditStudent(student)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-text-secondary italic">
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Forms Section */}
      <div className="grid gap-8 lg:grid-cols-12">
        
        {/* Individual Form */}
        <div className="lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle>{formMode === "create" ? "New Admission" : "Update Student Details"}</CardTitle>
              <CardDescription>
                Capture official biodata, assign class and stream placements.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-8" onSubmit={handleStudentSubmit}>
                
                <div className="space-y-6">
                  <div className="border-b border-border-subtle pb-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Personal Information</h3>
                  </div>
                  
                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField label="First Name" error={studentFieldErrors.firstName}>
                      <Input
                        id="student-firstName"
                        value={studentValues.firstName}
                        onChange={(event) =>
                          setStudentValues((current) => ({ ...current, firstName: event.target.value }))
                        }
                        placeholder="e.g., John"
                      />
                    </FormField>

                    <FormField label="Last Name" error={studentFieldErrors.lastName}>
                      <Input
                        id="student-lastName"
                        value={studentValues.lastName}
                        onChange={(event) =>
                          setStudentValues((current) => ({ ...current, lastName: event.target.value }))
                        }
                        placeholder="e.g., Doe"
                      />
                    </FormField>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField label="Gender" error={studentFieldErrors.gender}>
                      <Select
                        id="student-gender"
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
                      </Select>
                    </FormField>

                    <FormField label="Date of Birth" error={studentFieldErrors.dateOfBirth}>
                      <Input
                        id="student-dob"
                        type="date"
                        value={studentValues.dateOfBirth}
                        onChange={(event) =>
                          setStudentValues((current) => ({ ...current, dateOfBirth: event.target.value }))
                        }
                      />
                    </FormField>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="border-b border-border-subtle pb-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Academic Placement</h3>
                  </div>

                  <FormField label="Admission Number" error={studentFieldErrors.admissionNumber}>
                    <Input
                      id="student-admissionNumber"
                      value={studentValues.admissionNumber}
                      onChange={(event) =>
                        setStudentValues((current) => ({ ...current, admissionNumber: event.target.value }))
                      }
                      placeholder="e.g., SCH-2024-001"
                    />
                  </FormField>

                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField label="Class" error={studentFieldErrors.currentClassId}>
                      <Select
                        id="student-class"
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
                      </Select>
                    </FormField>

                    <FormField label="Stream" error={studentFieldErrors.currentStreamId}>
                      <Select
                        id="student-stream"
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
                      </Select>
                    </FormField>
                  </div>
                </div>

                {studentFormError ? (
                  <div className="rounded-xl border border-error/20 bg-error/5 p-4 text-sm font-medium text-error">
                    {studentFormError}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <PrimaryButton type="submit" disabled={isSubmittingStudent}>
                    {isSubmittingStudent ? "Saving..." : formMode === "create" ? "Add Student" : "Save Changes"}
                  </PrimaryButton>
                  {formMode === "edit" ? (
                    <Button type="button" variant="outline" onClick={resetStudentForm}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Upload Form */}
        <div className="lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload</CardTitle>
              <CardDescription>
                Upload admissions from Excel or CSV, validate, and commit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-4">
                <div className="relative group rounded-2xl border-2 border-dashed border-border-subtle bg-background/50 p-8 text-center transition hover:border-primary/40 hover:bg-primary-light/5">
                  <label htmlFor="bulk-file" className="cursor-pointer flex flex-col items-center">
                    <div className="mb-4 rounded-full bg-primary-light/20 p-4 text-primary group-hover:scale-110 transition-transform">
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-text-primary">Click to upload CSV or XLSX</p>
                    <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                      Required: admissionNumber, firstName, lastName, gender, dateOfBirth, classId
                    </p>
                  </label>
                  <input
                    id="bulk-file"
                    type="file"
                    className="hidden"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleBulkFileChange}
                  />
                </div>

                {bulkFileName && (
                  <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-white p-4 shadow-soft">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <svg className="h-5 w-5 text-primary/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm font-semibold text-text-primary truncate">{bulkFileName}</span>
                    </div>
                    <span className="shrink-0 rounded-lg bg-primary-light/20 px-2.5 py-1 text-xs font-bold text-primary">
                      {bulkRows.length} rows
                    </span>
                  </div>
                )}
              </div>

              {renderBulkPreviewTable()}

              {bulkError ? (
                <div className="rounded-xl border border-error/20 bg-error/5 p-4 text-sm font-medium text-error">
                  {bulkError}
                </div>
              ) : null}

              {bulkSuccess ? (
                <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-sm font-medium text-success">
                  {bulkSuccess}
                </div>
              ) : null}

              {bulkPreview ? (
                <div className="space-y-4">
                  <div className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-bold ${bulkPreview.valid ? "bg-success/5 text-success border-success/20" : "bg-error/5 text-error border-error/20"}`}>
                    {bulkPreview.valid ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    )}
                    {bulkPreview.valid ? "Validation successful. Ready to commit." : "Issues detected in some rows."}
                  </div>

                  {!bulkPreview.valid && (
                    <Card>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16">Row</TableHead>
                              <TableHead>Admission</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bulkPreview.rows.map((row) => (
                              <TableRow key={row.index}>
                                <TableCell className="text-text-secondary font-mono">{row.index + 1}</TableCell>
                                <TableCell className="font-medium text-text-primary">{row.admissionNumber}</TableCell>
                                <TableCell>
                                  {row.issues.length ? (
                                    <ul className="list-disc pl-4 text-xs font-medium text-error">
                                      {row.issues.map((issue) => (
                                        <li key={issue}>{issue}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="text-xs font-bold text-success">Valid</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-4 border-t border-border-subtle">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleBulkPreview()}
                  disabled={!bulkRows.length || isPreviewing}
                  className="flex-1"
                >
                  {isPreviewing ? "Validating..." : "Preview & Validate"}
                </Button>
                <PrimaryButton
                  type="button"
                  onClick={() => void handleBulkCommit()}
                  disabled={Boolean(!bulkRows.length || isCommitting || (bulkPreview && !bulkPreview.valid))}
                  className="flex-1"
                >
                  {isCommitting ? "Committing..." : "Commit Upload"}
                </PrimaryButton>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>

      {setupError ? (
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 text-sm font-medium text-warning-dark">
          {setupError}
        </div>
      ) : null}
    </div>
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
