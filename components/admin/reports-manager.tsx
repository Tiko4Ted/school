"use client";

import { useEffect, useMemo, useState } from "react";
import { publishReportAction, reopenReportAction, updateRemarkAction } from "@/app/admin/reports/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { z } from "zod";

type SetupData = {
  classes: { id: string; name: string; level: number }[];
  academicYears: {
    id: string;
    name: string;
    terms: { id: string; name: string }[];
  }[];
};

type ExamRecord = {
  id: string;
  name: string;
  term: { id: string; name: string };
  startDate: string;
};

type ReportRecord = {
  id: string;
  term: { id: string; name: string; academicYear: { name: string } };
  class: { id: string; name: string };
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  reopenedAt: string | null;
  exams: { id: string; position: number; exam: { id: string; name: string } }[];
  remarks: {
    id: string;
    studentId: string;
    remark: string;
    classTeacherName: string | null;
    student: { id: string; admissionNumber: string; firstName: string; lastName: string };
  }[];
};

export function ReportsManager() {
  const [setup, setSetup] = useState<SetupData>({ classes: [], academicYears: [] });
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);

  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [publishValues, setPublishValues] = useState({ termId: "", classId: "", examIds: [] as string[] });
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [remarkDrafts, setRemarkDrafts] = useState<Record<string, { remark: string; classTeacherName?: string }>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [remarkErrors, setRemarkErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoadingData(true);
    setDataError(null);
    try {
      const [setupResponse, examsResponse, reportsResponse] = await Promise.all([
        fetch("/api/setup", { cache: "no-store" }),
        fetch("/api/exams", { cache: "no-store" }),
        fetch("/api/reports", { cache: "no-store" }),
      ]);
      const setupPayload = (await setupResponse.json().catch(() => null)) as { data?: SetupData; error?: string } | null;
      const examsPayload = (await examsResponse.json().catch(() => null)) as { data?: ExamRecord[]; error?: string } | null;
      const reportsPayload = (await reportsResponse.json().catch(() => null)) as { data?: ReportRecord[]; error?: string } | null;

      if (!setupResponse.ok) {
        setDataError(setupPayload?.error ?? "Failed to load setup data.");
        return;
      }
      if (!examsResponse.ok) {
        setDataError(examsPayload?.error ?? "Failed to load exams.");
        return;
      }
      if (!reportsResponse.ok) {
        setDataError(reportsPayload?.error ?? "Failed to load reports.");
        return;
      }

      setSetup(setupPayload?.data ?? { classes: [], academicYears: [] });
      setExams(examsPayload?.data ?? []);
      setReports(reportsPayload?.data ?? []);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Failed to load data.");
    } finally {
      setLoadingData(false);
    }
  }

  async function reloadReports() {
    const response = await fetch("/api/reports", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { data?: ReportRecord[]; error?: string } | null;
    if (!response.ok) {
      setActionMessage(payload?.error ?? "Failed to refresh reports.");
      return;
    }
    setReports(payload?.data ?? []);
  }

  const termOptions = setup.academicYears.flatMap((year) =>
    year.terms.map((term) => ({
      id: term.id,
      label: `${year.name} · ${term.name}`,
    })),
  );

  const examOptions = useMemo(() => {
    if (!publishValues.termId) {
      return [];
    }
    return exams.filter((exam) => exam.term.id === publishValues.termId);
  }, [exams, publishValues.termId]);

  const publishValidation = publishFormSchema.safeParse(publishValues);

  const publishFieldErrors =
    publishValidation && !publishValidation.success ? publishValidation.error.flatten().fieldErrors : {};
  const publishDisabled = isPublishing || !publishValidation.success;

  async function handlePublish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPublishMessage(null);
    setActionMessage(null);

    if (!publishValidation.success) {
      setPublishMessage(
        publishValidation.error.flatten().formErrors[0] ?? "Fill in term, class, and at least one exam (max 3).",
      );
      return;
    }

    setIsPublishing(true);
    const result = await publishReportAction(publishValidation.data);
    setIsPublishing(false);

    if (!result.success) {
      setPublishMessage(result.error ?? "Failed to publish report.");
      return;
    }

    setPublishMessage("Report published.");
    await reloadReports();
  }

  async function handleReopen(reportId: string) {
    setActionMessage(null);
    const result = await reopenReportAction({ reportId });
    if (!result.success) {
      setActionMessage(result.error ?? "Failed to reopen report.");
      return;
    }
    setActionMessage("Report reopened.");
    await reloadReports();
  }

  async function handleRemarkSave(reportId: string, studentId: string) {
    setActionMessage(null);
    const key = `${reportId}:${studentId}`;
    const draft = remarkDrafts[key];
    if (!draft) {
      setActionMessage("No draft available.");
      return;
    }

    const normalized = {
      remark: draft.remark,
      classTeacherName: draft.classTeacherName?.trim() ? draft.classTeacherName : undefined,
    };
    const parsed = remarkDraftSchema.safeParse(normalized);
    if (!parsed.success) {
      const message = parsed.error.flatten().formErrors[0] ?? "Remark must be at least 3 characters.";
      setRemarkErrors((current) => ({ ...current, [key]: message }));
      return;
    }

    const result = await updateRemarkAction({
      reportId,
      studentId,
      remark: parsed.data.remark,
      classTeacherName: parsed.data.classTeacherName,
    });

    if (!result.success) {
      setActionMessage(result.error ?? "Failed to update remark.");
      return;
    }

    setActionMessage("Remark updated.");
    setRemarkErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    await reloadReports();
  }

  const pdfLink = (report: ReportRecord) => `/api/reports?reportId=${report.id}&format=pdf`;

  const currentReports = reports;

  useEffect(() => {
    if (expandedReportId) {
      const report = reports.find((item) => item.id === expandedReportId);
      if (report) {
        const drafts: Record<string, { remark: string; classTeacherName?: string }> = {};
        report.remarks.forEach((remark) => {
          drafts[`${report.id}:${remark.studentId}`] = {
            remark: remark.remark,
            classTeacherName: remark.classTeacherName ?? "",
          };
        });
        setRemarkDrafts(drafts);
      }
    }
  }, [expandedReportId, reports]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fdf2f8_0%,#f8fafc_42%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-6xl space-y-8">
        <Card className="border-pink-100 bg-white/95">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-600">Report publishing</p>
            <CardTitle className="text-3xl">Compose & publish reports</CardTitle>
            <CardDescription className="text-base">
              Select a term, class, and up to three exams to publish consolidated reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingData ? <p className="text-sm text-slate-600">Loading setup data…</p> : null}
            {dataError ? <p className="text-sm text-rose-600">{dataError}</p> : null}
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handlePublish}>
              <label className="space-y-2 text-sm text-slate-700">
                Term
                <select
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-pink-500"
                  value={publishValues.termId}
                  onChange={(event) =>
                    setPublishValues((current) => ({
                      ...current,
                      termId: event.target.value,
                      examIds: [],
                    }))
                  }
                >
                  <option value="">Select term</option>
                  {termOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {publishFieldErrors.termId ? (
                  <p className="text-xs text-rose-600">{publishFieldErrors.termId[0]}</p>
                ) : null}
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                Class
                <select
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-pink-500"
                  value={publishValues.classId}
                  onChange={(event) => setPublishValues((current) => ({ ...current, classId: event.target.value }))}
                >
                  <option value="">Select class</option>
                  {setup.classes
                    .slice()
                    .sort((a, b) => a.level - b.level)
                    .map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                </select>
                {publishFieldErrors.classId ? (
                  <p className="text-xs text-rose-600">{publishFieldErrors.classId[0]}</p>
                ) : null}
              </label>
              <div className="md:col-span-2">
                <p className="text-sm font-semibold text-slate-700">Exams (max 3)</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {examOptions.length === 0 ? (
                    <p className="text-sm text-slate-500">Select a term to see its exams.</p>
                  ) : (
                    examOptions.map((exam) => {
                      const selected = publishValues.examIds.includes(exam.id);
                      return (
                        <label
                          key={exam.id}
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              setPublishValues((current) => {
                                const next = selected
                                  ? current.examIds.filter((id) => id !== exam.id)
                                  : [...current.examIds, exam.id];
                                return { ...current, examIds: next.slice(0, 3) };
                              });
                            }}
                          />
                          {exam.name} – {new Date(exam.startDate).toLocaleDateString()}
                        </label>
                      );
                    })
                  )}
                </div>
                {publishFieldErrors.examIds ? (
                  <p className="mt-2 text-xs text-rose-600">{publishFieldErrors.examIds[0]}</p>
                ) : null}
              </div>
              {publishMessage ? (
                <p className="md:col-span-2 text-sm text-slate-600">{publishMessage}</p>
              ) : null}
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={publishDisabled}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPublishing ? "Publishing…" : "Publish report"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPublishValues({
                      termId: "",
                      classId: "",
                      examIds: [],
                    })
                  }
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Clear form
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {actionMessage ? <p className="text-sm text-slate-600">{actionMessage}</p> : null}

        <Card className="border-pink-100 bg-white/95">
          <CardHeader>
            <CardTitle className="text-2xl">Published reports</CardTitle>
            <CardDescription className="text-base">Manage status, remarks, and exports.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentReports.length === 0 ? <p className="text-sm text-slate-600">No reports yet.</p> : null}
            <div className="space-y-4">
              {currentReports.map((report) => (
                <div key={report.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">
                        {report.class.name} · {report.term.academicYear.name} {report.term.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        Status: {report.status}
                        {report.publishedAt ? ` • Published ${new Date(report.publishedAt).toLocaleDateString()}` : null}
                        {report.reopenedAt ? ` • Reopened ${new Date(report.reopenedAt).toLocaleDateString()}` : null}
                      </p>
                      <p className="text-sm text-slate-600">
                        Exams: {report.exams.map((item) => item.exam.name).join(", ") || "None"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ButtonLink href={pdfLink(report)} variant="outline">
                        Export PDF
                      </ButtonLink>
                      {report.status === "PUBLISHED" ? (
                        <button
                          type="button"
                          onClick={() => void handleReopen(report.id)}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                        >
                          Reopen
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedReportId((current) => (current === report.id ? null : report.id));
                          setActionMessage(null);
                        }}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                      >
                        {expandedReportId === report.id ? "Hide remarks" : "Edit remarks"}
                      </button>
                    </div>
                  </div>
                  {expandedReportId === report.id ? (
                    <div className="mt-4 space-y-4">
                      <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-600">Remark</th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-600">Class Teacher</th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {report.remarks.map((remark) => {
                              const key = `${report.id}:${remark.studentId}`;
                              const draft = remarkDrafts[key] ?? {
                                remark: remark.remark,
                                classTeacherName: remark.classTeacherName ?? "",
                              };
                              const normalizedDraft = {
                                remark: draft.remark,
                                classTeacherName: draft.classTeacherName?.trim() ? draft.classTeacherName : undefined,
                              };
                              const rowValidation = remarkDraftSchema.safeParse(normalizedDraft);
                              return (
                                <tr key={remark.id}>
                                  <td className="px-4 py-3 text-slate-900">
                                    {remark.student.admissionNumber} – {remark.student.firstName} {remark.student.lastName}
                                  </td>
                                  <td className="px-4 py-3">
                                    <textarea
                                      className="min-h-[60px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-pink-500"
                                      value={draft.remark}
                                      onChange={(event) =>
                                        setRemarkDrafts((current) => ({
                                          ...current,
                                          [key]: { ...(current[key] ?? {}), remark: event.target.value },
                                        }))
                                      }
                                    />
                                    {remarkErrors[key] ? (
                                      <p className="mt-1 text-xs text-rose-600">{remarkErrors[key]}</p>
                                    ) : null}
                                  </td>
                                  <td className="px-4 py-3">
                                    <input
                                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-pink-500"
                                      value={draft.classTeacherName ?? ""}
                                      onChange={(event) =>
                                        setRemarkDrafts((current) => ({
                                          ...current,
                                          [key]: { ...(current[key] ?? {}), classTeacherName: event.target.value },
                                        }))
                                      }
                                      placeholder="Optional"
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <button
                                      type="button"
                                      onClick={() => void handleRemarkSave(report.id, remark.studentId)}
                                      disabled={!rowValidation.success}
                                      className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                      Save
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
  const publishFormSchema = z.object({
    termId: z.string().uuid(),
    classId: z.string().uuid(),
    examIds: z.array(z.string().uuid()).min(1).max(3),
  });

  const remarkDraftSchema = z.object({
    remark: z.string().trim().min(3, "Remark must be at least 3 characters."),
    classTeacherName: z.string().trim().min(2).optional(),
  });
