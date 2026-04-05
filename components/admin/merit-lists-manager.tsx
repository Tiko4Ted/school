"use client";

import { useEffect, useMemo, useState } from "react";
import { generateMeritListAction } from "@/app/admin/merit/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { z } from "zod";

type SetupClass = {
  id: string;
  name: string;
  level: number;
  streams: { id: string; name: string }[];
};

type ExamOption = {
  id: string;
  name: string;
  startDate: string;
  term: { name: string };
  configurations: { classId: string; subjectId: string }[];
};

type MeritListResponse = {
  id: string;
  examId: string;
  classId: string;
  generatedAt: string;
  entries: Array<{
    id: string;
    classRank: number;
    streamRank: number;
    totalScore: number;
    averageScore: number;
    improvement: number | null;
    stream: { id: string; name: string };
    student: { id: string; admissionNumber: string; firstName: string; lastName: string };
  }>;
  subjectChampions: Array<{
    id: string;
    score: number;
    subject: { id: string; name: string; code: string };
    student: { id: string; admissionNumber: string; firstName: string; lastName: string };
  }>;
  exam: { name: string; term: { name: string } };
  class: { name: string };
  topGirls: Array<{ studentId: string; studentName: string; score: number }>;
  topBoys: Array<{ studentId: string; studentName: string; score: number }>;
};

export function MeritListsManager() {
  const [classes, setClasses] = useState<SetupClass[]>([]);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");

  const [meritList, setMeritList] = useState<MeritListResponse | null>(null);
  const [isLoadingMerit, setIsLoadingMerit] = useState(false);
  const [meritError, setMeritError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [streamFilter, setStreamFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const selectionSchema = z.object({
    classId: z.string().uuid(),
    examId: z.string().uuid(),
  });

  const selectionPayload =
    selectedClassId && selectedExamId ? { classId: selectedClassId, examId: selectedExamId } : null;
  const selectionValidation = selectionPayload ? selectionSchema.safeParse(selectionPayload) : null;
  const selectionValid = Boolean(selectionValidation?.success);

  useEffect(() => {
    void loadOptions();
  }, []);

  async function loadOptions() {
    setIsLoadingOptions(true);
    setOptionsError(null);
    try {
      const [setupResponse, examsResponse] = await Promise.all([
        fetch("/api/setup", { cache: "no-store" }),
        fetch("/api/exams", { cache: "no-store" }),
      ]);
      const setupPayload = (await setupResponse.json().catch(() => null)) as
        | { data?: { classes?: SetupClass[] }; error?: string }
        | null;
      const examsPayload = (await examsResponse.json().catch(() => null)) as
        | { data?: ExamOption[]; error?: string }
        | null;

      if (!setupResponse.ok) {
        setOptionsError(setupPayload?.error ?? "Failed to load classes.");
        setIsLoadingOptions(false);
        return;
      }
      if (!examsResponse.ok) {
        setOptionsError(examsPayload?.error ?? "Failed to load exams.");
        setIsLoadingOptions(false);
        return;
      }

      setClasses(setupPayload?.data?.classes ?? []);
      setExams(examsPayload?.data ?? []);
    } catch (error) {
      setOptionsError(error instanceof Error ? error.message : "Failed to load options.");
    } finally {
      setIsLoadingOptions(false);
    }
  }

  async function fetchMeritList() {
    if (!selectionValid || !selectionValidation?.success) {
      setSelectionError(selectionValidation?.error?.flatten().formErrors[0] ?? "Select class and exam first.");
      setMeritError("Select class and exam first.");
      return;
    }

    setIsLoadingMerit(true);
    setMeritError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/merit-lists?examId=${selectedExamId}&classId=${selectedClassId}`,
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as { data?: MeritListResponse; error?: string } | null;

      if (!response.ok) {
        setMeritError(payload?.error ?? "Failed to load merit list.");
        return;
      }

      setMeritList(payload?.data ?? null);
    } catch (error) {
      setMeritError(error instanceof Error ? error.message : "Failed to load merit list.");
    } finally {
      setIsLoadingMerit(false);
    }
  }

  async function handleGenerate() {
    if (!selectionValid || !selectionValidation?.success) {
      setSelectionError(selectionValidation?.error?.flatten().formErrors[0] ?? "Select class and exam first.");
      setMeritError("Select class and exam first.");
      return;
    }
    const result = await generateMeritListAction(selectionValidation.data);
    if (!result.success) {
      setMeritError(result.error ?? "Failed to generate merit list.");
      return;
    }
    setSuccessMessage("Merit list generated successfully.");
    await fetchMeritList();
  }

  const currentClass = classes.find((cls) => cls.id === selectedClassId);
  const filteredEntries = useMemo(() => {
    if (!meritList) {
      return [];
    }
    return meritList.entries.filter((entry) => {
      const matchesStream = streamFilter === "all" || entry.stream.id === streamFilter;
      const searchTarget = `${entry.student.admissionNumber} ${entry.student.firstName} ${entry.student.lastName}`.toLowerCase();
      const matchesSearch = search.trim().length === 0 || searchTarget.includes(search.trim().toLowerCase());
      return matchesStream && matchesSearch;
    });
  }, [meritList, streamFilter, search]);

  const pdfLink =
    selectionValid && selectionValidation?.success
      ? `/api/merit-lists?examId=${selectionValidation.data.examId}&classId=${selectionValidation.data.classId}&format=pdf`
      : null;

  const streamOptions = currentClass?.streams ?? [];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef2ff_0%,#f8fafc_42%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-6xl space-y-8">
        <Card className="border-indigo-100 bg-white/95">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600">Merit Lists</p>
            <CardTitle className="text-3xl">Class performance rankings</CardTitle>
            <CardDescription className="text-base">
              Filter by class and exam, regenerate competition rankings, and export PDFs for circulation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingOptions ? <p className="text-sm text-slate-600">Loading classes and exams…</p> : null}
            {optionsError ? <p className="text-sm text-rose-600">{optionsError}</p> : null}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="class-select">
                  Class
                </label>
                <select
                  id="class-select"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
                  value={selectedClassId}
                  onChange={(event) => {
                    setSelectedClassId(event.target.value);
                    setMeritList(null);
                    setMeritError(null);
                    setSelectionError(null);
                  }}
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
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="exam-select">
                  Exam
                </label>
                <select
                  id="exam-select"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
                  value={selectedExamId}
                  onChange={(event) => {
                    setSelectedExamId(event.target.value);
                    setMeritList(null);
                    setMeritError(null);
                    setSelectionError(null);
                  }}
                >
                  <option value="">Select exam</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name} ({exam.term.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void fetchMeritList()}
                disabled={!selectionValid}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Fetch merit list
              </button>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={!selectionValid}
              >
                Regenerate
              </button>
              {pdfLink ? (
                <ButtonLink href={pdfLink} variant="outline">
                  Export PDF
                </ButtonLink>
              ) : null}
            </div>
            {meritError ? <p className="text-sm text-rose-600">{meritError}</p> : null}
            {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}
            {selectionError ? <p className="text-sm text-rose-600">{selectionError}</p> : null}
          </CardContent>
        </Card>

        {isLoadingMerit ? <p className="text-sm text-slate-600">Loading merit list…</p> : null}

        {meritList ? (
          <div className="space-y-6">
            <Card className="border-indigo-100 bg-white/95">
              <CardHeader>
                <CardTitle className="text-2xl">
                  {meritList.class.name} – {meritList.exam.name}
                </CardTitle>
                <CardDescription className="text-base">
                  Generated {new Date(meritList.generatedAt).toLocaleString()} • {filteredEntries.length} rows shown
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    Stream filter
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-indigo-500"
                      value={streamFilter}
                      onChange={(event) => setStreamFilter(event.target.value)}
                    >
                      <option value="all">All streams</option>
                      {streamOptions.map((stream) => (
                        <option key={stream.id} value={stream.id}>
                          {stream.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    Search
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-indigo-500"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Admission or name"
                    />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Top girls</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      {meritList.topGirls.length ? (
                        meritList.topGirls.map((girl) => (
                          <li key={girl.studentId}>
                            {girl.studentName} – {girl.score.toFixed(2)}
                          </li>
                        ))
                      ) : (
                        <li>No data</li>
                      )}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Top boys</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      {meritList.topBoys.length ? (
                        meritList.topBoys.map((boy) => (
                          <li key={boy.studentId}>
                            {boy.studentName} – {boy.score.toFixed(2)}
                          </li>
                        ))
                      ) : (
                        <li>No data</li>
                      )}
                    </ul>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Subject champions</p>
                  <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-slate-600">Subject</th>
                          <th className="px-3 py-2 text-left text-slate-600">Student</th>
                          <th className="px-3 py-2 text-left text-slate-600">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {meritList.subjectChampions.map((champion) => (
                          <tr key={champion.id}>
                            <td className="px-3 py-2 text-slate-900">
                              {champion.subject.name} ({champion.subject.code})
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {champion.student.admissionNumber} – {champion.student.firstName} {champion.student.lastName}
                            </td>
                            <td className="px-3 py-2 text-slate-700">{Number(champion.score).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Class Rank</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Stream Rank</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Stream</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Total</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Average</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Improvement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-4 py-3 text-slate-900">{entry.classRank}</td>
                          <td className="px-4 py-3 text-slate-700">{entry.streamRank}</td>
                          <td className="px-4 py-3 text-slate-900">
                            {entry.student.admissionNumber} – {entry.student.firstName} {entry.student.lastName}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{entry.stream.name}</td>
                          <td className="px-4 py-3 text-slate-700">{entry.totalScore.toFixed(2)}</td>
                          <td className="px-4 py-3 text-slate-700">{entry.averageScore.toFixed(2)}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {entry.improvement == null ? "—" : entry.improvement.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {filteredEntries.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-slate-600" colSpan={7}>
                            No entries match the selected filters.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>
    </main>
  );
}
