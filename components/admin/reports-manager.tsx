"use client";

import { useEffect, useMemo, useState } from "react";
import { publishReportAction, reopenReportAction, updateRemarkAction } from "@/app/admin/reports/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, ButtonLink, PrimaryButton } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

const publishFormSchema = z.object({
  termId: z.string().uuid("Select a term."),
  classId: z.string().uuid("Select a class."),
  examIds: z.array(z.string().uuid()).min(1, "Select at least one exam.").max(3, "Maximum 3 exams."),
});

const remarkDraftSchema = z.object({
  remark: z.string().trim().min(3, "Remark must be at least 3 characters."),
  classTeacherName: z.string().trim().min(2).optional(),
});

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
    <div className="space-y-10">
      {/* Configuration Section */}
      <Card className="border-none shadow-soft overflow-visible">
        <CardHeader className="border-b border-border-subtle dark:border-border-dark bg-background/50 p-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-primary-light/50 text-primary">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <div>
              <CardTitle className="text-2xl">Publish Reports</CardTitle>
              <CardDescription className="text-sm font-medium">Configure and consolidate termly student performance reports.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {loadingData ? (
            <div className="py-10 text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-text-secondary animate-pulse">Loading system parameters...</p>
            </div>
          ) : dataError ? (
            <div className="rounded-xl border border-error/20 bg-error/5 p-4 text-sm font-bold text-error">
              {dataError}
            </div>
          ) : (
            <form className="space-y-8" onSubmit={handlePublish}>
              <div className="grid gap-8 md:grid-cols-2">
                <FormField label="Target Academic Term" error={publishFieldErrors.termId?.[0]}>
                  <Select
                    value={publishValues.termId}
                    onChange={(event) =>
                      setPublishValues((current) => ({
                        ...current,
                        termId: event.target.value,
                        examIds: [],
                      }))
                    }
                    className="h-12"
                  >
                    <option value="">Choose term...</option>
                    {termOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Target Class" error={publishFieldErrors.classId?.[0]}>
                  <Select
                    value={publishValues.classId}
                    onChange={(event) => setPublishValues((current) => ({ ...current, classId: event.target.value }))}
                    className="h-12"
                  >
                    <option value="">Choose class...</option>
                    {setup.classes
                      .slice()
                      .sort((a, b) => a.level - b.level)
                      .map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                  </Select>
                </FormField>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-text-secondary/60">Selected Assessment Periods</p>
                  <span className="text-[10px] font-bold text-primary bg-primary-light/30 px-2 py-0.5 rounded-lg border border-primary-light/50">{publishValues.examIds.length} / 3 Selected</span>
                </div>
                
                {examOptions.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-border-subtle dark:border-border-dark p-8 text-center bg-background/30">
                    <p className="text-sm font-bold text-text-secondary/40 italic">Select an academic term first to view available exams.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {examOptions.map((exam) => {
                      const selected = publishValues.examIds.includes(exam.id);
                      return (
                        <label
                          key={exam.id}
                          className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition-all duration-200 ${
                            selected 
                              ? "border-primary bg-primary-light/20 shadow-soft ring-4 ring-primary/5" 
                              : "border-border-subtle bg-background/50 hover:border-primary/30 dark:border-border-dark"
                          }`}
                        >
                          <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-colors ${selected ? "border-primary bg-primary" : "border-border-subtle bg-white dark:bg-card-dark dark:border-border-dark"}`}>
                            {selected && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-sm font-black tracking-tight ${selected ? "text-primary" : "text-text-primary dark:text-text-primary-dark"}`}>{exam.name}</span>
                            <span className="text-[10px] font-bold text-text-secondary/60 uppercase">{new Date(exam.startDate).toLocaleDateString()}</span>
                          </div>
                          <input
                            type="checkbox"
                            className="sr-only"
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
                        </label>
                      );
                    })}
                  </div>
                )}
                {publishFieldErrors.examIds && (
                  <p className="text-xs font-bold text-error ml-1">{publishFieldErrors.examIds[0]}</p>
                )}
              </div>
              
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-border-subtle dark:border-border-dark">
                <div>
                  {publishMessage && (
                    <p className={`text-sm font-bold flex items-center gap-2 ${publishMessage.includes("published") ? "text-secondary" : "text-error"}`}>
                      <span className={`h-2 w-2 rounded-full ${publishMessage.includes("published") ? "bg-secondary" : "bg-error"}`}></span>
                      {publishMessage}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setPublishValues({
                        termId: "",
                        classId: "",
                        examIds: [],
                      })
                    }
                    className="h-12 px-8 font-black uppercase tracking-widest text-xs"
                  >
                    Reset Form
                  </Button>
                  <PrimaryButton 
                    type="submit" 
                    disabled={publishDisabled}
                    className="h-12 px-10 font-black uppercase tracking-widest text-xs shadow-soft"
                  >
                    {isPublishing ? "Processing..." : "Commit Publication"}
                  </PrimaryButton>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Published Management Section */}
      <Card className="border-none shadow-soft overflow-hidden">
        <CardHeader className="bg-background/80 dark:bg-background-dark/80 p-8 border-b border-border-subtle dark:border-border-dark">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">Consolidated Archive</CardTitle>
              <CardDescription className="text-sm font-medium">History of published report cards and active drafts.</CardDescription>
            </div>
            {actionMessage && (
              <div className="rounded-xl border border-secondary/20 bg-secondary-light/30 px-4 py-2 text-xs font-black text-secondary animate-in fade-in slide-in-from-top-1">
                {actionMessage}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {reports.length === 0 ? (
            <div className="py-24 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-background dark:bg-background-dark border-2 border-dashed border-border-subtle dark:border-border-dark mb-6 text-text-secondary/20">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
              </div>
              <p className="text-sm font-black text-text-secondary/40 uppercase tracking-[0.2em]">No records found</p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle dark:divide-border-dark">
              {reports.map((report) => (
                <div key={report.id} className="group transition-all hover:bg-primary-light/5">
                  <div className="flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-6">
                      <div className={`h-14 w-14 shrink-0 flex items-center justify-center rounded-2xl border-2 transition-colors ${
                        report.status === "PUBLISHED" ? "border-secondary/20 bg-secondary-light/20 text-secondary" : "border-accent/20 bg-accent-light/20 text-accent"
                      }`}>
                         <span className="text-lg font-black">{report.class.name.charAt(0)}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-black tracking-tight text-text-primary dark:text-text-primary-dark">
                            {report.class.name} · {report.term.academicYear.name}
                          </h4>
                          <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border ${
                            report.status === "PUBLISHED" 
                              ? "bg-secondary-light/50 text-secondary border-secondary/20" 
                              : "bg-accent-light/50 text-accent border-accent/20"
                          }`}>
                            {report.status}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-text-secondary/80">
                          Period: {report.term.name} • Assessment: {report.exams.map((item) => item.exam.name).join(" + ") || "None"}
                        </p>
                        <div className="flex items-center gap-4 pt-1">
                          {report.publishedAt && (
                            <span className="text-[10px] font-bold uppercase text-text-secondary/60">Published: {new Date(report.publishedAt).toLocaleDateString()}</span>
                          )}
                          {report.reopenedAt && (
                            <span className="text-[10px] font-bold uppercase text-accent">Modified: {new Date(report.reopenedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <ButtonLink 
                        href={pdfLink(report)} 
                        variant="outline"
                        className="h-10 px-5 font-bold text-xs uppercase tracking-wider border-secondary text-secondary hover:bg-secondary-light/20"
                      >
                        Print PDF
                      </ButtonLink>
                      
                      {report.status === "PUBLISHED" && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleReopen(report.id)}
                          className="h-10 px-5 font-bold text-xs uppercase tracking-wider border-accent text-accent hover:bg-accent-light/20"
                        >
                          Revise
                        </Button>
                      )}
                      
                      <PrimaryButton
                        type="button"
                        onClick={() => {
                          setExpandedReportId((current) => (current === report.id ? null : report.id));
                          setActionMessage(null);
                        }}
                        className={`h-10 px-5 font-bold text-xs uppercase tracking-wider shadow-soft ${expandedReportId === report.id ? "bg-text-primary dark:bg-background-dark" : ""}`}
                      >
                        {expandedReportId === report.id ? "Close Remarks" : "Manage Remarks"}
                      </PrimaryButton>
                    </div>
                  </div>

                  {expandedReportId === report.id && (
                    <div className="bg-background/40 dark:bg-background-dark/20 border-t border-border-subtle dark:border-border-dark animate-in slide-in-from-top-2 duration-300">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-background/80 dark:bg-background-dark/80">
                            <TableHead className="py-4">Student Profile</TableHead>
                            <TableHead className="w-1/2 py-4">Educational Remarks</TableHead>
                            <TableHead className="py-4">Endorsement</TableHead>
                            <TableHead className="text-right py-4 pr-8">Control</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
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
                              <TableRow key={remark.id} className="hover:bg-white dark:hover:bg-card-dark transition-colors">
                                <TableCell className="py-6 align-top">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-extrabold text-text-primary dark:text-text-primary-dark">{remark.student.firstName} {remark.student.lastName}</span>
                                    <span className="inline-flex w-fit rounded-lg bg-background dark:bg-background-dark px-2 py-0.5 text-[10px] font-black uppercase text-text-secondary border border-border-subtle dark:border-border-dark tracking-tighter">
                                      {remark.student.admissionNumber}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-6">
                                  <div className="space-y-2">
                                    <textarea
                                      className="min-h-[100px] w-full rounded-2xl border border-border-subtle bg-background px-4 py-3 text-sm font-medium text-text-primary outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-border-dark dark:bg-background-dark"
                                      value={draft.remark}
                                      placeholder="Professional observation of student performance..."
                                      onChange={(event) =>
                                        setRemarkDrafts((current) => ({
                                          ...current,
                                          [key]: { ...(current[key] ?? {}), remark: event.target.value },
                                        }))
                                      }
                                    />
                                    {remarkErrors[key] && (
                                      <p className="text-[10px] font-black uppercase text-error tracking-widest">{remarkErrors[key]}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-6 align-top">
                                  <Input
                                    value={draft.classTeacherName ?? ""}
                                    placeholder="Teacher Endorsement"
                                    className="h-10 font-bold text-xs"
                                    onChange={(event) =>
                                      setRemarkDrafts((current) => ({
                                        ...current,
                                        [key]: { ...(current[key] ?? {}), classTeacherName: event.target.value },
                                      }))
                                    }
                                  />
                                </TableCell>
                                <TableCell className="text-right py-6 pr-8 align-top">
                                  <Button
                                    type="button"
                                    variant="primary"
                                    className="h-10 px-6 font-black uppercase tracking-widest text-[10px]"
                                    onClick={() => void handleRemarkSave(report.id, remark.studentId)}
                                    disabled={!rowValidation.success}
                                  >
                                    Commit
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-center pb-10">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-text-secondary/30">
          Institutional Report Management System
        </p>
      </div>
    </div>
  );
}
