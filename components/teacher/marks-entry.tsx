"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Papa from "papaparse";
import { submitBulkMarks, submitSingleMark } from "@/app/teacher/marks/actions";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PrimaryButton, Button } from "@/components/ui/button";

type Assignment = {
  id: string;
  stream: { id: string; name: string; class: { id: string; name: string } };
  subject: { id: string; name: string; code: string };
};

type ExamOption = {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  term: { name: string };
  configurations: { classId: string; subjectId: string }[];
};

type TeacherOptionsResponse = {
  assignments: Assignment[];
  exams: ExamOption[];
};

type StudentMarkRow = {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  existingScore: number | null;
};

type StudentsResponse = {
  reviewLocked: boolean;
  students: StudentMarkRow[];
};

type BulkCandidate = StudentMarkRow & { score: number };

const singleEntrySchema = z.object({
  examId: z.string().uuid(),
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  score: z.number().min(0).max(100),
});

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString();
}

export function TeacherMarksEntry() {
  const [options, setOptions] = useState<TeacherOptionsResponse | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");

  const [studentsResponse, setStudentsResponse] = useState<StudentsResponse | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const [singleStudentId, setSingleStudentId] = useState("");
  const [singleScore, setSingleScore] = useState("");
  const [singleMessage, setSingleMessage] = useState<string | null>(null);
  const [isSinglePending, startSingleTransition] = useTransition();

  const [bulkRows, setBulkRows] = useState<BulkCandidate[]>([]);
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const [isBulkPending, startBulkTransition] = useTransition();
  const [singleClientError, setSingleClientError] = useState<string | null>(null);

  useEffect(() => {
    void loadOptions();
  }, []);

  const selectedAssignment = useMemo(
    () => options?.assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null,
    [options, selectedAssignmentId],
  );

  const examChoices = useMemo(() => {
    if (!options || !selectedAssignment) {
      return [];
    }

    return options.exams.filter((exam) =>
      exam.configurations.some(
        (config) => config.classId === selectedAssignment.stream.class.id && config.subjectId === selectedAssignment.subject.id,
      ),
    );
  }, [options, selectedAssignment]);

  useEffect(() => {
    if (selectedAssignment && selectedExamId) {
      void loadStudents(selectedExamId, selectedAssignment.stream.id, selectedAssignment.subject.id);
    } else {
      setStudentsResponse(null);
      setStudentsError(null);
    }
  }, [selectedExamId, selectedAssignment]);

  async function loadOptions() {
    setOptionsLoading(true);
    setOptionsError(null);
    try {
      const response = await fetch("/api/marks?view=teacher-options", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { data?: TeacherOptionsResponse; error?: string } | null;

      if (!response.ok) {
        setOptionsError(payload?.error ?? "Failed to load teacher assignments.");
        setOptionsLoading(false);
        return;
      }

      setOptions(payload?.data ?? { assignments: [], exams: [] });
    } catch (error) {
      setOptionsError(error instanceof Error ? error.message : "Failed to load teacher assignments.");
    } finally {
      setOptionsLoading(false);
    }
  }

  async function loadStudents(examId: string, streamId: string, subjectId: string) {
    setStudentsLoading(true);
    setStudentsError(null);
    setStudentsResponse(null);
    setSingleMessage(null);
    setBulkError(null);
    setBulkSuccess(null);
    setBulkRows([]);
    setBulkFileName(null);

    try {
      const response = await fetch(
        `/api/marks?view=teacher-students&examId=${examId}&streamId=${streamId}&subjectId=${subjectId}`,
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as { data?: StudentsResponse; error?: string } | null;

      if (!response.ok) {
        setStudentsError(payload?.error ?? "Failed to load students for this selection.");
        return;
      }

      setStudentsResponse(payload?.data ?? { reviewLocked: false, students: [] });
    } catch (error) {
      setStudentsError(error instanceof Error ? error.message : "Failed to load students for this selection.");
    } finally {
      setStudentsLoading(false);
    }
  }

  const selectedStudents = studentsResponse?.students ?? [];
  const reviewLocked = studentsResponse?.reviewLocked ?? false;
  const assignmentInfo = selectedAssignment
    ? `${selectedAssignment.stream.class.name} ${selectedAssignment.stream.name} · ${selectedAssignment.subject.name}`
    : null;

  const singlePayload =
    selectedAssignment && selectedExamId && singleStudentId && singleScore.trim().length > 0
      ? {
          examId: selectedExamId,
          studentId: singleStudentId,
          subjectId: selectedAssignment.subject.id,
          score: Number(singleScore),
        }
      : null;

  const singleValidation = singlePayload ? singleEntrySchema.safeParse(singlePayload) : null;
  const singleSubmitDisabled = Boolean(reviewLocked || isSinglePending || !singleValidation?.success);
  const singleValidationError =
    singleValidation && !singleValidation.success
      ? singleValidation.error.flatten().formErrors[0] ?? "Provide a valid student and score between 0 and 100."
      : null;

  async function handleSingleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSingleClientError(null);
    if (!singleValidation?.success) {
      setSingleClientError(singleValidationError);
      return;
    }

    startSingleTransition(async () => {
      const result = await submitSingleMark(singleValidation.data);
      if (!result.success) {
        setSingleMessage(result.error ?? "Failed to save mark.");
        return;
      }
      setSingleMessage("Mark saved.");
      setSingleScore("");
      if (selectedAssignment) {
        await loadStudents(selectedExamId, selectedAssignment.stream.id, selectedAssignment.subject.id);
      }
    });
  }

  async function handleBulkFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setBulkError(null);
    setBulkSuccess(null);
    setBulkRows([]);
    setBulkFileName(null);

    if (!file) {
      return;
    }

    if (!selectedStudents.length) {
      setBulkError("Load students before parsing a file.");
      return;
    }

    try {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

      if (parsed.errors.length) {
        setBulkError("CSV parse error. Verify headers and encoding.");
        return;
      }

      const rows = (parsed.data as Record<string, string>[]).map((row) => ({
        admissionNumber: String(row.admissionNumber ?? "").trim(),
        score: Number(row.score),
      }));

      const candidates: BulkCandidate[] = [];
      for (const row of rows) {
        if (!row.admissionNumber) {
          continue;
        }
        if (Number.isNaN(row.score)) {
          setBulkError(`Invalid score for admission ${row.admissionNumber}.`);
          return;
        }
        const student = selectedStudents.find((candidate) => candidate.admissionNumber === row.admissionNumber);
        if (!student) {
          setBulkError(`Admission ${row.admissionNumber} is not in this stream.`);
          return;
        }
        candidates.push({ ...student, score: row.score });
      }

      if (!candidates.length) {
        setBulkError("No valid rows detected.");
        return;
      }

      setBulkRows(candidates);
      setBulkFileName(file.name);
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : "Failed to read file.");
    }
  }

  async function handleBulkSubmit() {
    if (!selectedAssignment || !selectedExamId) {
      setBulkError("Select exam and assignment first.");
      return;
    }
    if (!bulkRows.length) {
      setBulkError("Load a CSV before submitting.");
      return;
    }

    startBulkTransition(async () => {
      const result = await submitBulkMarks({
        examId: selectedExamId,
        streamId: selectedAssignment.stream.id,
        subjectId: selectedAssignment.subject.id,
        rows: bulkRows.map((row) => ({
          studentId: row.id,
          score: row.score,
        })),
      });

      if (!result.success) {
        setBulkError(result.error ?? "Failed to save marks.");
        return;
      }

      setBulkSuccess("Bulk marks saved.");
      setBulkError(null);
      setBulkRows([]);
      setBulkFileName(null);
      
      const fileInput = document.getElementById("bulk-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      await loadStudents(selectedExamId, selectedAssignment.stream.id, selectedAssignment.subject.id);
    });
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Teacher Mark Entry</CardTitle>
          <CardDescription>
            Choose a stream + subject assignment to enter marks for configured exams.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {optionsLoading ? <p className="text-sm text-text-secondary">Loading assignments...</p> : null}
          {optionsError ? <p className="text-sm font-medium text-error">{optionsError}</p> : null}

          <div className="grid gap-6 md:grid-cols-2">
            <FormField label="Stream + Subject" id="assignment-select">
              <Select
                id="assignment-select"
                value={selectedAssignmentId}
                onChange={(event) => {
                  setSelectedAssignmentId(event.target.value);
                  setSelectedExamId("");
                  setStudentsResponse(null);
                  setStudentsError(null);
                }}
              >
                <option value="">Select assignment</option>
                {options?.assignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.stream.class.name} {assignment.stream.name} · {assignment.subject.name} ({assignment.subject.code})
                  </option>
                ))}
              </Select>
            </FormField>
            
            <FormField label="Exam" id="exam-select">
              <Select
                id="exam-select"
                value={selectedExamId}
                onChange={(event) => setSelectedExamId(event.target.value)}
                disabled={!selectedAssignment}
              >
                <option value="">Select exam</option>
                {examChoices.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name} ({exam.term.name}) — {formatDate(exam.startDate)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {assignmentInfo ? (
            <div className="rounded-xl bg-secondary-light/30 px-4 py-3 text-sm font-semibold text-secondary border border-secondary-light dark:bg-secondary-light/10">
              Working on <span className="underline decoration-secondary/30 decoration-2 underline-offset-4">{assignmentInfo}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {studentsError ? (
        <div className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm font-medium text-error">
          {studentsError}
        </div>
      ) : null}

      {studentsLoading ? <p className="text-sm text-text-secondary">Loading students for selection...</p> : null}

      {studentsResponse ? (
        <div className="space-y-8">
          {reviewLocked ? (
            <div className="rounded-xl border border-accent/20 bg-accent-light/30 p-4 text-sm font-medium text-accent dark:bg-accent-light/10">
              This stream and subject have already been reviewed for the selected exam. Further edits are disabled.
            </div>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-12">
            {/* Single Entry */}
            <div className="lg:col-span-5">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Single Entry</CardTitle>
                  <CardDescription>Update one student at a time.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-6" onSubmit={handleSingleSubmit}>
                    <FormField label="Student" id="single-student">
                      <Select
                        id="single-student"
                        value={singleStudentId}
                        onChange={(event) => setSingleStudentId(event.target.value)}
                        disabled={reviewLocked}
                      >
                        <option value="">Select student</option>
                        {selectedStudents.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.admissionNumber} — {student.firstName} {student.lastName} {student.existingScore != null ? `(${student.existingScore})` : ""}
                          </option>
                        ))}
                      </Select>
                    </FormField>

                    <FormField label="Score (0-100)" id="single-score" error={singleClientError || singleValidationError}>
                      <Input
                        id="single-score"
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={singleScore}
                        onChange={(event) => setSingleScore(event.target.value)}
                        disabled={reviewLocked}
                        placeholder="Enter score"
                      />
                    </FormField>

                    {singleMessage ? (
                      <div className="rounded-xl border border-secondary/20 bg-secondary-light/30 p-4 text-sm font-medium text-secondary">
                        {singleMessage}
                      </div>
                    ) : null}

                    <PrimaryButton
                      type="submit"
                      className="w-full bg-secondary hover:opacity-90"
                      disabled={singleSubmitDisabled}
                    >
                      {isSinglePending ? "Saving..." : "Save Mark"}
                    </PrimaryButton>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Bulk Upload */}
            <div className="lg:col-span-7">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Bulk Upload</CardTitle>
                  <CardDescription>
                    Upload CSV with headers <code className="rounded bg-background px-1.5 py-0.5 text-xs text-text-primary dark:bg-background-dark dark:text-text-primary-dark">admissionNumber</code> and <code className="rounded bg-background px-1.5 py-0.5 text-xs text-text-primary dark:bg-background-dark dark:text-text-primary-dark">score</code>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-2xl border-2 border-dashed border-border-subtle bg-background/50 p-8 text-center dark:border-border-dark dark:bg-background-dark/50">
                    <label htmlFor="bulk-file" className={`cursor-pointer block ${reviewLocked ? "opacity-50" : ""}`}>
                      <div className="inline-flex items-center justify-center rounded-2xl bg-secondary-light/50 p-4 mb-4 text-secondary">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-text-primary dark:text-text-primary-dark mb-1">Click to upload CSV</p>
                      <p className="text-xs text-text-secondary">Standard school marks CSV template</p>
                    </label>
                    <input
                      id="bulk-file"
                      type="file"
                      accept=".csv"
                      onChange={handleBulkFileChange}
                      disabled={reviewLocked}
                      className="hidden"
                    />
                  </div>

                  {bulkFileName && (
                    <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-card p-4 shadow-soft dark:border-border-dark dark:bg-card-dark">
                      <div className="flex items-center space-x-3 overflow-hidden text-secondary">
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <span className="text-sm font-semibold truncate">{bulkFileName}</span>
                      </div>
                      <span className="text-[10px] font-bold text-secondary bg-secondary-light/50 px-2 py-1 rounded-lg shrink-0 uppercase tracking-wider">
                        {bulkRows.length} students
                      </span>
                    </div>
                  )}

                  {bulkError ? (
                    <div className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm font-medium text-error">
                      {bulkError}
                    </div>
                  ) : null}

                  {bulkSuccess ? (
                    <div className="rounded-xl border border-secondary/20 bg-secondary-light/30 p-4 text-sm font-medium text-secondary">
                      {bulkSuccess}
                    </div>
                  ) : null}

                  {bulkRows.length ? (
                    <div className="rounded-xl border border-border-subtle overflow-hidden dark:border-border-dark">
                      <div className="border-b border-border-subtle bg-background/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-secondary dark:border-border-dark">
                        CSV Preview
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <Table>
                          <TableBody>
                            {bulkRows.map((row) => (
                              <TableRow key={row.id}>
                                <TableCell className="py-2 font-semibold text-text-primary dark:text-text-primary-dark">{row.admissionNumber}</TableCell>
                                <TableCell className="py-2 text-xs">
                                  {row.firstName} {row.lastName}
                                </TableCell>
                                <TableCell className="py-2 text-right font-bold text-secondary">{row.score}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : null}

                  <div className="pt-2">
                    <PrimaryButton
                      type="button"
                      className="w-full bg-secondary hover:opacity-90"
                      onClick={() => void handleBulkSubmit()}
                      disabled={Boolean(reviewLocked || !bulkRows.length || isBulkPending)}
                    >
                      {isBulkPending ? "Submitting Marks..." : "Commit Bulk Marks"}
                    </PrimaryButton>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Current Mark Sheet</CardTitle>
              <CardDescription>Verified records for the selected combination.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-semibold text-text-primary dark:text-text-primary-dark">{student.admissionNumber}</TableCell>
                      <TableCell>
                        {student.firstName} {student.lastName}
                      </TableCell>
                      <TableCell className="text-right">
                        {student.existingScore != null ? (
                          <span className="inline-flex items-center rounded-lg bg-primary-light px-3 py-1 text-sm font-bold text-primary">
                            {student.existingScore}
                          </span>
                        ) : (
                          <span className="text-text-secondary/40">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-12 text-center text-text-secondary italic">
                        No student records found for this scope.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
