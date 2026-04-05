"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Papa from "papaparse";
import { submitBulkMarks, submitSingleMark } from "@/app/teacher/marks/actions";
import { z } from "zod";

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
  const singleSubmitDisabled = reviewLocked || isSinglePending || !singleValidation?.success;
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
      await loadStudents(selectedExamId, selectedAssignment.stream.id, selectedAssignment.subject.id);
    });
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f0f9ff_0%,#f8fafc_42%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <header className="mb-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-600">Marks workflow</p>
            <h1 className="text-3xl font-semibold">Teacher mark entry</h1>
            <p className="text-slate-600">
              Choose a stream + subject assignment and only exams configured for that combination will be available.
            </p>
          </header>

          {optionsLoading ? <p className="text-sm text-slate-600">Loading assignments...</p> : null}
          {optionsError ? <p className="text-sm text-rose-600">{optionsError}</p> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="assignment-select">
                Stream + subject
              </label>
              <select
                id="assignment-select"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
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
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="exam-select">
                Exam
              </label>
              <select
                id="exam-select"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
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
              </select>
            </div>
          </div>

          {assignmentInfo ? (
            <p className="mt-3 text-sm text-slate-600">
              Working on <span className="font-medium text-slate-900">{assignmentInfo}</span>
            </p>
          ) : null}
        </div>

        {studentsError ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{studentsError}</p> : null}

        {studentsLoading ? <p className="text-sm text-slate-600">Loading students for the selected stream...</p> : null}

        {studentsResponse ? (
          <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
            {reviewLocked ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                This stream and subject have already been reviewed for the selected exam. Further edits are disabled.
              </p>
            ) : null}

            <section className="space-y-4">
              <header>
                <h2 className="text-2xl font-semibold text-slate-900">Single entry</h2>
                <p className="text-sm text-slate-600">Update one student at a time.</p>
              </header>
              <form className="grid gap-4 md:grid-cols-[2fr,1fr,auto]" onSubmit={handleSingleSubmit}>
                <select
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-cyan-500"
                  value={singleStudentId}
                  onChange={(event) => setSingleStudentId(event.target.value)}
                  disabled={reviewLocked}
                >
                  <option value="">Select student</option>
                  {selectedStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.admissionNumber} — {student.firstName} {student.lastName}{" "}
                      {student.existingScore != null ? `(current: ${student.existingScore})` : ""}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={singleScore}
                  onChange={(event) => setSingleScore(event.target.value)}
                  disabled={reviewLocked}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-cyan-500"
                  placeholder="Score"
                />
                <button
                  type="submit"
                  disabled={singleSubmitDisabled}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSinglePending ? "Saving..." : "Save mark"}
                </button>
              </form>
              {singleClientError ? <p className="text-sm text-rose-600">{singleClientError}</p> : null}
              {!singleClientError && singleValidationError ? (
                <p className="text-sm text-rose-600">{singleValidationError}</p>
              ) : null}
              {singleMessage ? <p className="text-sm text-slate-600">{singleMessage}</p> : null}
            </section>

            <section className="space-y-4">
              <header>
                <h2 className="text-2xl font-semibold text-slate-900">Bulk upload</h2>
                <p className="text-sm text-slate-600">
                  Upload CSV with headers <code className="rounded bg-slate-100 px-2 py-0.5 text-xs">admissionNumber</code> and{" "}
                  <code className="rounded bg-slate-100 px-2 py-0.5 text-xs">score</code>.
                </p>
              </header>
              <input
                type="file"
                accept=".csv"
                onChange={handleBulkFileChange}
                disabled={reviewLocked}
                className="text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
              />
              {bulkFileName ? <p className="text-xs text-slate-500">Loaded file: {bulkFileName}</p> : null}
              {bulkError ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{bulkError}</p> : null}
              {bulkSuccess ? (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{bulkSuccess}</p>
              ) : null}
              {bulkRows.length ? (
                <div className="rounded-2xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                    CSV preview ({bulkRows.length} rows)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-slate-600">Admission</th>
                          <th className="px-3 py-2 text-left text-slate-600">Name</th>
                          <th className="px-3 py-2 text-left text-slate-600">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {bulkRows.map((row) => (
                          <tr key={row.id}>
                            <td className="px-3 py-2 text-slate-700">{row.admissionNumber}</td>
                            <td className="px-3 py-2 text-slate-700">
                              {row.firstName} {row.lastName}
                            </td>
                            <td className="px-3 py-2 text-slate-700">{row.score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => void handleBulkSubmit()}
                disabled={reviewLocked || !bulkRows.length || isBulkPending}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isBulkPending ? "Submitting..." : "Commit bulk marks"}
              </button>
            </section>

            <section className="space-y-4">
              <header>
                <h2 className="text-2xl font-semibold text-slate-900">Current scores</h2>
                <p className="text-sm text-slate-600">Reference table for the selected exam and stream.</p>
              </header>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Admission</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {selectedStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="px-4 py-3 text-slate-900">{student.admissionNumber}</td>
                        <td className="px-4 py-3 text-slate-900">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{student.existingScore != null ? student.existingScore : "—"}</td>
                      </tr>
                    ))}
                    {selectedStudents.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={3}>
                          No students available for this stream.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}
