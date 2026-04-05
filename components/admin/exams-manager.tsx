"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ExamRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  term: {
    id: string;
    name: string;
    academicYear: { id: string; name: string };
  };
  configurations: {
    id: string;
    class: { id: string; name: string };
    subject: { id: string; name: string; code: string };
  }[];
};

type SetupClass = {
  id: string;
  name: string;
  level: number;
  classSubjects: {
    id: string;
    subject: {
      id: string;
      name: string;
      code: string;
    };
  }[];
};

type SetupResponse = {
  classes: SetupClass[];
  academicYears: {
    id: string;
    name: string;
    terms: {
      id: string;
      name: string;
      startDate: string;
      endDate: string;
      isActive: boolean;
    }[];
  }[];
};

type ExamConfigRow = {
  subject: { id: string };
};

const examFormSchema = z
  .object({
    termId: z.string().uuid("Select a term."),
    name: z.string().trim().min(2, "Exam name is required."),
    startDate: z.string().trim().min(1, "Start date is required."),
    endDate: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    { message: "End date must be on or after start date.", path: ["endDate"] },
  );

const configurationSchema = z.object({
  classId: z.string().uuid("Select a class."),
  subjectIds: z.array(z.string().uuid()).min(1, "Select at least one subject."),
});

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

export function ExamsManager() {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [examsError, setExamsError] = useState<string | null>(null);

  const [setup, setSetup] = useState<SetupResponse>({ classes: [], academicYears: [] });
  const [setupError, setSetupError] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examValues, setExamValues] = useState({
    termId: "",
    name: "",
    startDate: "",
    endDate: "",
  });
  const [examFieldErrors, setExamFieldErrors] = useState<Record<string, string>>({});
  const [examFormError, setExamFormError] = useState<string | null>(null);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);

  const [configurationExamId, setConfigurationExamId] = useState("");
  const [configurationClassId, setConfigurationClassId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const [configurationSuccess, setConfigurationSuccess] = useState<string | null>(null);
  const [isLoadingConfiguration, setIsLoadingConfiguration] = useState(false);
  const [isSavingConfiguration, setIsSavingConfiguration] = useState(false);

  useEffect(() => {
    void loadExams();
    void loadSetupData();
  }, []);

  async function loadExams() {
    setIsLoadingExams(true);
    setExamsError(null);
    const response = await fetch("/api/exams", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { data?: ExamRecord[]; error?: string } | null;

    if (!response.ok) {
      setExamsError(payload?.error ?? "Failed to load exams.");
      setIsLoadingExams(false);
      return;
    }

    setExams(payload?.data ?? []);
    setIsLoadingExams(false);
  }

  async function loadSetupData() {
    const response = await fetch("/api/setup", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { data?: SetupResponse; error?: string } | null;

    if (!response.ok) {
      setSetupError(payload?.error ?? "Failed to load setup data.");
      return;
    }

    setSetup({
      classes: payload?.data?.classes ?? [],
      academicYears: payload?.data?.academicYears ?? [],
    });
  }

  const termOptions = useMemo(() => {
    return setup.academicYears.flatMap((year) =>
      year.terms.map((term) => ({
        id: term.id,
        label: `${year.name} · ${term.name}`,
      })),
    );
  }, [setup.academicYears]);

  const sortedClasses = useMemo(() => {
    return [...setup.classes].sort((a, b) => a.level - b.level);
  }, [setup.classes]);

  function resetExamForm() {
    setFormMode("create");
    setEditingExamId(null);
    setExamValues({
      termId: "",
      name: "",
      startDate: "",
      endDate: "",
    });
    setExamFieldErrors({});
    setExamFormError(null);
  }

  function handleEditExam(exam: ExamRecord) {
    setFormMode("edit");
    setEditingExamId(exam.id);
    setExamValues({
      termId: exam.term.id,
      name: exam.name,
      startDate: formatDate(exam.startDate),
      endDate: formatDate(exam.endDate),
    });
    setExamFieldErrors({});
    setExamFormError(null);
  }

  async function handleExamSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingExam(true);
    setExamFormError(null);
    setExamFieldErrors({});

    const parsed = examFormSchema.safeParse(examValues);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setExamFieldErrors({
        termId: fieldErrors.termId?.[0] ?? "",
        name: fieldErrors.name?.[0] ?? "",
        startDate: fieldErrors.startDate?.[0] ?? "",
        endDate: fieldErrors.endDate?.[0] ?? "",
      });
      setIsSubmittingExam(false);
      return;
    }

    const endpoint = formMode === "create" ? "/api/exams" : `/api/exams/${editingExamId}`;
    const method = formMode === "create" ? "POST" : "PATCH";

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setExamFormError(payload?.error ?? "Failed to save exam.");
      setIsSubmittingExam(false);
      return;
    }

    await loadExams();
    resetExamForm();
    setIsSubmittingExam(false);
  }

  function handleSubjectToggle(subjectId: string) {
    setSelectedSubjectIds((current) =>
      current.includes(subjectId) ? current.filter((id) => id !== subjectId) : [...current, subjectId],
    );
  }

  async function handleLoadConfiguration(examId: string, classId: string) {
    if (!examId || !classId) {
      setSelectedSubjectIds([]);
      return;
    }

    setIsLoadingConfiguration(true);
    setConfigurationError(null);
    const response = await fetch(`/api/exams/${examId}/configurations?classId=${classId}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { data?: ExamConfigRow[]; error?: string } | null;

    if (!response.ok) {
      setConfigurationError(payload?.error ?? "Failed to load configuration.");
      setIsLoadingConfiguration(false);
      return;
    }

    setSelectedSubjectIds((payload?.data ?? []).map((item) => item.subject.id));
    setIsLoadingConfiguration(false);
  }

  async function handleConfigurationSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configurationExamId || !configurationClassId) {
      setConfigurationError("Select an exam and class before configuring subjects.");
      return;
    }

    setIsSavingConfiguration(true);
    setConfigurationError(null);
    setConfigurationSuccess(null);

    const parsed = configurationSchema.safeParse({
      classId: configurationClassId,
      subjectIds: selectedSubjectIds,
    });

    if (!parsed.success) {
      const errorMessage = parsed.error.flatten().formErrors[0] ?? parsed.error.flatten().fieldErrors.subjectIds?.[0];
      setConfigurationError(errorMessage ?? "Invalid configuration.");
      setIsSavingConfiguration(false);
      return;
    }

    const response = await fetch(`/api/exams/${configurationExamId}/configurations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setConfigurationError(payload?.error ?? "Failed to save configuration.");
      setIsSavingConfiguration(false);
      return;
    }

    setConfigurationSuccess("Subjects saved for this class.");
    await loadExams();
    await handleLoadConfiguration(configurationExamId, configurationClassId);
    setIsSavingConfiguration(false);
  }

  useEffect(() => {
    if (configurationExamId && configurationClassId) {
      void handleLoadConfiguration(configurationExamId, configurationClassId);
    } else {
      setSelectedSubjectIds([]);
    }
  }, [configurationExamId, configurationClassId]);

  const selectedClassSubjects = useMemo(() => {
    return setup.classes.find((cls) => cls.id === configurationClassId)?.classSubjects ?? [];
  }, [configurationClassId, setup.classes]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ecfeff_0%,#f8fafc_42%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-6xl space-y-8">
        <Card className="border-cyan-100 bg-white/95">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-600">Exams</p>
              <CardTitle className="text-3xl">Exam schedule</CardTitle>
              <CardDescription className="text-base">
                Review all exams, linked terms, and class-subject scopes before marks entry opens.
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={() => void loadExams()}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Refresh list
            </button>
          </CardHeader>
          <CardContent>
            {isLoadingExams ? <p className="text-sm text-slate-600">Loading exams...</p> : null}
            {examsError ? <p className="text-sm text-rose-600">{examsError}</p> : null}
            {!isLoadingExams && !examsError ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Exam</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Term</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Dates</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Configurations</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {exams.map((exam) => {
                      const classGroups = exam.configurations.reduce<Record<string, { className: string; subjects: string[] }>>(
                        (acc, config) => {
                          const key = config.class.id;
                          if (!acc[key]) {
                            acc[key] = { className: config.class.name, subjects: [] };
                          }
                          acc[key].subjects.push(config.subject.name);
                          return acc;
                        },
                        {},
                      );
                      return (
                        <tr key={exam.id}>
                          <td className="px-4 py-3 font-semibold text-slate-900">{exam.name}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {exam.term.academicYear.name} · {exam.term.name}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatDate(exam.startDate)}{" "}
                            {exam.endDate ? (
                              <>
                                – {formatDate(exam.endDate)}
                              </>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {Object.keys(classGroups).length === 0 ? (
                              <span className="text-slate-500">Not configured</span>
                            ) : (
                              <ul className="space-y-1">
                                {Object.values(classGroups).map((group) => (
                                  <li key={group.className}>
                                    <span className="font-semibold">{group.className}:</span> {group.subjects.join(", ")}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleEditExam(exam)}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {exams.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={5}>
                          No exams found.
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
          <Card className="border-cyan-100 bg-white/95">
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-600">
                {formMode === "create" ? "Create exam" : "Edit exam"}
              </p>
              <CardTitle>{formMode === "create" ? "New exam" : "Update exam details"}</CardTitle>
              <CardDescription className="text-base">
                Link exams to academic terms and keep timelines accurate for teachers and reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleExamSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="exam-term">
                    Term
                  </label>
                  <select
                    id="exam-term"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                    value={examValues.termId}
                    onChange={(event) => setExamValues((current) => ({ ...current, termId: event.target.value }))}
                  >
                    <option value="">Select term</option>
                    {termOptions.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.label}
                      </option>
                    ))}
                  </select>
                  {examFieldErrors.termId ? <p className="text-sm text-rose-600">{examFieldErrors.termId}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="exam-name">
                    Name
                  </label>
                  <input
                    id="exam-name"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                    value={examValues.name}
                    onChange={(event) => setExamValues((current) => ({ ...current, name: event.target.value }))}
                  />
                  {examFieldErrors.name ? <p className="text-sm text-rose-600">{examFieldErrors.name}</p> : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="exam-start">
                      Start date
                    </label>
                    <input
                      id="exam-start"
                      type="date"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                      value={examValues.startDate}
                      onChange={(event) => setExamValues((current) => ({ ...current, startDate: event.target.value }))}
                    />
                    {examFieldErrors.startDate ? <p className="text-sm text-rose-600">{examFieldErrors.startDate}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="exam-end">
                      End date (optional)
                    </label>
                    <input
                      id="exam-end"
                      type="date"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                      value={examValues.endDate}
                      onChange={(event) => setExamValues((current) => ({ ...current, endDate: event.target.value }))}
                    />
                    {examFieldErrors.endDate ? <p className="text-sm text-rose-600">{examFieldErrors.endDate}</p> : null}
                  </div>
                </div>

                {examFormError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{examFormError}</div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isSubmittingExam}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmittingExam ? "Saving..." : formMode === "create" ? "Create exam" : "Save changes"}
                  </button>
                  {formMode === "edit" ? (
                    <button
                      type="button"
                      onClick={resetExamForm}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                    >
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-cyan-100 bg-white/95">
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-600">Configuration</p>
              <CardTitle>Class subject scope</CardTitle>
              <CardDescription className="text-base">
                Align each exam with the exact class/subject mix allowed for marks entry.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleConfigurationSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="config-exam">
                    Exam
                  </label>
                  <select
                    id="config-exam"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                    value={configurationExamId}
                    onChange={(event) => {
                      setConfigurationExamId(event.target.value);
                      setConfigurationSuccess(null);
                    }}
                  >
                    <option value="">Select exam</option>
                    {exams.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.name} ({exam.term.academicYear.name} · {exam.term.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="config-class">
                    Class
                  </label>
                  <select
                    id="config-class"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                    value={configurationClassId}
                    onChange={(event) => {
                      setConfigurationClassId(event.target.value);
                      setConfigurationSuccess(null);
                    }}
                    disabled={!configurationExamId}
                  >
                    <option value="">Select class</option>
                    {sortedClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                {isLoadingConfiguration ? <p className="text-sm text-slate-600">Loading configuration...</p> : null}

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Subjects</p>
                  {selectedClassSubjects.length === 0 ? (
                    <p className="text-sm text-slate-500">Select a class to view its mapped subjects.</p>
                  ) : (
                    <div className="grid gap-2">
                      {selectedClassSubjects.map((item) => (
                        <label
                          key={item.subject.id}
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSubjectIds.includes(item.subject.id)}
                            onChange={() => handleSubjectToggle(item.subject.id)}
                          />
                          {item.subject.name} ({item.subject.code})
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {configurationError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{configurationError}</div>
                ) : null}

                {configurationSuccess ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {configurationSuccess}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={!configurationExamId || !configurationClassId || isSavingConfiguration}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingConfiguration ? "Saving..." : "Save configuration"}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>

        {setupError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{setupError}</div>
        ) : null}
      </section>
    </main>
  );
}
