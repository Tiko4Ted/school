"use client";

import { useEffect, useMemo, useState } from "react";
import { publishReportAction, reopenReportAction, updateRemarkAction } from "@/app/admin/reports/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, ButtonLink, PrimaryButton } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
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

const remarkDraftSchema = z.object({
  remark: z.string().trim().min(3, "Remark must be at least 3 characters."),
  classTeacherName: z.string().trim().min(2).optional(),
});

export function ReportsManager() {
  const [setup, setSetup] = useState<SetupData>({ classes: [], academicYears: [] });
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);

  const [loadingData, setLoadingData] = useState(true);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isRemarksOpen, setIsRemarksOpen] = useState(false);
  
  const [publishValues, setPublishValues] = useState({ termId: "", classId: "", examIds: [] as string[] });
  const [isPublishing, setIsPublishing] = useState(false);

  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [remarkDrafts, setRemarkDrafts] = useState<Record<string, { remark: string; classTeacherName?: string }>>({});
  const [remarkErrors, setRemarkErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoadingData(true);
    const [setupResponse, examsResponse, reportsResponse] = await Promise.all([
      fetch("/api/setup", { cache: "no-store" }),
      fetch("/api/exams", { cache: "no-store" }),
      fetch("/api/reports", { cache: "no-store" }),
    ]);
    const setupPayload = await setupResponse.json();
    const examsPayload = await examsResponse.json();
    const reportsPayload = await reportsResponse.json();

    setSetup(setupPayload.data);
    setExams(examsPayload.data);
    setReports(reportsPayload.data);
    setLoadingData(false);
  }

  async function reloadReports() {
    const response = await fetch("/api/reports", { cache: "no-store" });
    const payload = await response.json();
    setReports(payload.data ?? []);
  }

  const termOptions = setup.academicYears.flatMap((year) =>
    year.terms.map((term) => ({
      id: term.id,
      label: `${year.name} · ${term.name}`,
    })),
  );

  const examOptions = useMemo(() => exams.filter((exam) => exam.term.id === publishValues.termId), [exams, publishValues.termId]);

  async function handlePublish() {
    if (!publishValues.termId || !publishValues.classId || !publishValues.examIds.length) return;
    setIsPublishing(true);
    const result = await publishReportAction(publishValues);
    if (result.success) {
      await reloadReports();
      setIsPublishOpen(false);
    }
    setIsPublishing(false);
  }

  async function handleRemarkSave(reportId: string, studentId: string) {
    const key = `${reportId}:${studentId}`;
    const draft = remarkDrafts[key];
    if (!draft) return;

    const result = await updateRemarkAction({
      reportId,
      studentId,
      remark: draft.remark,
      classTeacherName: draft.classTeacherName || undefined,
    });

    if (result.success) await reloadReports();
  }

  const activeReport = useMemo(() => reports.find(r => r.id === activeReportId), [reports, activeReportId]);

  useEffect(() => {
    if (activeReport) {
      const drafts: Record<string, { remark: string; classTeacherName?: string }> = {};
      activeReport.remarks.forEach((r) => {
        drafts[`${activeReport.id}:${r.studentId}`] = { remark: r.remark, classTeacherName: r.classTeacherName ?? "" };
      });
      setRemarkDrafts(drafts);
    }
  }, [activeReport]);

  return (
    <div className="space-y-6 pb-20">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border-subtle bg-background/50 py-6">
          <div className="space-y-1">
            <CardTitle className="text-xl">Report Card Archive</CardTitle>
            <CardDescription>Consolidated termly assessments and historical student reports.</CardDescription>
          </div>
          <PrimaryButton onClick={() => setIsPublishOpen(true)} className="h-10 px-8 font-bold uppercase text-[10px]">New Publication</PrimaryButton>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-background/80">
              <TableHead className="py-3">Academic Period</TableHead>
              <TableHead className="py-3">Class Level</TableHead>
              <TableHead className="py-3">Status</TableHead>
              <TableHead className="py-3 text-right pr-8">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id} className="group hover:bg-primary-light/5 transition-colors">
                  <TableCell className="py-2">
                    <p className="text-[13px] font-black text-text-primary uppercase">{report.term.academicYear.name} · {report.term.name}</p>
                    <span className="text-[9px] font-bold text-text-secondary/40">{report.exams.map(e => e.exam.name).join(' + ')}</span>
                  </TableCell>
                  <TableCell className="py-2 text-[11px] font-black text-primary uppercase">{report.class.name}</TableCell>
                  <TableCell className="py-2">
                    <span className={`inline-flex rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${report.status === 'PUBLISHED' ? 'bg-secondary-light/50 text-secondary border border-secondary/20' : 'bg-accent-light/50 text-accent border border-accent/20'}`}>
                      {report.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 pr-8 text-right">
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => { setActiveReportId(report.id); setIsRemarksOpen(true); }} variant="outline" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest">Remarks</Button>
                      <ButtonLink href={`/api/reports?reportId=${report.id}&format=pdf`} variant="outline" className="h-8 px-3 text-[10px] font-black uppercase border-secondary text-secondary hover:bg-secondary-light/20">Print</ButtonLink>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog isOpen={isPublishOpen} onClose={() => setIsPublishOpen(false)} size="xl" title="Consolidate & Publish Reports">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Target Scope</h3>
            <div className="grid gap-4">
              <FormField label="Academic Term"><Select value={publishValues.termId} onChange={e => setPublishValues(c => ({...c, termId: e.target.value, examIds: []}))} className="h-11">{termOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</Select></FormField>
              <FormField label="Target Class"><Select value={publishValues.classId} onChange={e => setPublishValues(c => ({...c, classId: e.target.value}))} className="h-11">{setup.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></FormField>
            </div>
          </div>
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Assessments to Include</h3>
            <div className="grid gap-2">
              {examOptions.map(e => (
                <label key={e.id} className="flex items-center gap-3 p-3 rounded-xl border border-border-subtle hover:bg-slate-50 cursor-pointer transition-colors">
                  <input type="checkbox" checked={publishValues.examIds.includes(e.id)} onChange={() => setPublishValues(c => {
                    const next = c.examIds.includes(e.id) ? c.examIds.filter(id => id !== e.id) : [...c.examIds, e.id];
                    return {...c, examIds: next.slice(0, 3)};
                  })} className="h-4 w-4 rounded border-border-subtle text-primary" />
                  <span className="text-[11px] font-black uppercase tracking-tight">{e.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-6 mt-8">
          <Button type="button" variant="outline" onClick={() => setIsPublishOpen(false)} className="h-11 px-8 font-black uppercase tracking-widest text-[10px]">Cancel</Button>
          <PrimaryButton onClick={handlePublish} disabled={isPublishing || !publishValues.examIds.length} className="h-11 px-10 font-black uppercase tracking-widest text-[10px] shadow-soft">Commit Publication</PrimaryButton>
        </div>
      </Dialog>

      <Dialog isOpen={isRemarksOpen} onClose={() => setIsRemarksOpen(false)} size="full" title={`Student Remarks: ${activeReport?.class.name ?? ''}`}>
        <div className="max-h-[70vh] overflow-y-auto">
          <Table>
            <TableHeader><TableRow className="bg-background/80">
              <TableHead className="py-3">Student Profile</TableHead>
              <TableHead className="py-3 w-1/2">Professional Remark</TableHead>
              <TableHead className="py-3">Endorsement</TableHead>
              <TableHead className="py-3 text-right pr-8">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {activeReport?.remarks.map((r) => {
                const key = `${activeReport.id}:${r.studentId}`;
                const draft = remarkDrafts[key] ?? { remark: r.remark, classTeacherName: r.classTeacherName ?? "" };
                return (
                  <TableRow key={r.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="py-3">
                      <p className="text-[12px] font-black text-text-primary">{r.student.firstName} {r.student.lastName}</p>
                      <span className="text-[9px] font-bold text-text-secondary/40 uppercase tracking-tighter">{r.student.admissionNumber}</span>
                    </TableCell>
                    <TableCell className="py-3"><textarea className="w-full rounded-xl border border-border-subtle bg-background px-3 py-2 text-[11px] font-medium outline-none focus:ring-4 focus:ring-primary/5 min-h-[60px]" value={draft.remark} onChange={e => setRemarkDrafts(c => ({...c, [key]: {...draft, remark: e.target.value}}))} /></TableCell>
                    <TableCell className="py-3"><Input className="h-9 text-[11px] font-bold" value={draft.classTeacherName} onChange={e => setRemarkDrafts(c => ({...c, [key]: {...draft, classTeacherName: e.target.value}}))} /></TableCell>
                    <TableCell className="py-3 text-right pr-8"><Button onClick={() => handleRemarkSave(activeReport.id, r.studentId)} className="h-8 px-4 text-[9px] font-black uppercase bg-primary text-white">Save</Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end pt-6 border-t border-border-subtle mt-4">
          <Button variant="outline" onClick={() => setIsRemarksOpen(false)} className="h-10 px-8 font-black uppercase text-[10px]">Close Manager</Button>
        </div>
      </Dialog>
    </div>
  );
}
