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

type ExamConfiguration = {
  id: string;
  class: { id: string; name: string };
  subject: { id: string; name: string; code: string };
};

type ExamRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  term: { id: string; name: string; academicYear: { id: string; name: string } };
  configurations: ExamConfiguration[];
};

type SetupData = {
  classes: { id: string; name: string; classSubjects: { subject: { id: string; name: string; code: string } }[] }[];
  academicYears: { id: string; name: string; terms: { id: string; name: string }[] }[];
};

const examSchema = z.object({
  termId: z.string().uuid("Select a term."),
  name: z.string().trim().min(2, "Exam name is required."),
  startDate: z.string().trim().min(1, "Start date is required."),
  endDate: z.string().trim().optional(),
});

export function ExamsManager() {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [examsError, setExamsError] = useState<string | null>(null);

  const [setup, setSetup] = useState<SetupData | null>(null);
  const [isSetupLoading, setIsSetupLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examValues, setExamValues] = useState({ termId: "", name: "", startDate: "", endDate: "" });
  const [examFieldErrors, setExamFieldErrors] = useState<Record<string, string>>({});
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);

  const [configExamId, setConfigExamId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [isSubmittingConfig, setIsSubmittingConfig] = useState(false);

  useEffect(() => {
    void loadExams();
    void loadSetupData();
  }, []);

  async function loadExams() {
    setIsLoadingExams(true);
    const response = await fetch("/api/exams", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setExams(payload.data ?? []);
    else setExamsError(payload.error ?? "Failed to load exams.");
    setIsLoadingExams(false);
  }

  async function loadSetupData() {
    const response = await fetch("/api/setup", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setSetup(payload.data);
    setIsSetupLoading(false);
  }

  function resetForm() {
    setFormMode("create");
    setEditingExamId(null);
    setExamValues({ termId: "", name: "", startDate: "", endDate: "" });
    setExamFieldErrors({});
    setIsFormOpen(false);
  }

  function handleEditExam(exam: ExamRecord) {
    setFormMode("edit");
    setEditingExamId(exam.id);
    setExamValues({
      termId: exam.term.id,
      name: exam.name,
      startDate: exam.startDate.split('T')[0],
      endDate: exam.endDate ? exam.endDate.split('T')[0] : "",
    });
    setIsFormOpen(true);
  }

  async function handleExamSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmittingExam(true);
    const parsed = examSchema.safeParse(examValues);
    if (!parsed.success) {
      setExamFieldErrors(parsed.error.flatten().fieldErrors as any);
      setIsSubmittingExam(false);
      return;
    }

    const method = formMode === "create" ? "POST" : "PATCH";
    const endpoint = formMode === "create" ? "/api/exams" : `/api/exams/${editingExamId}`;
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    if (response.ok) {
      await loadExams();
      resetForm();
    }
    setIsSubmittingExam(false);
  }

  async function handleConfigSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configExamId || !selectedClassId || !selectedSubjectIds.length) return;
    setIsSubmittingConfig(true);
    const response = await fetch(`/api/exams/${configExamId}/configurations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: selectedClassId, subjectIds: selectedSubjectIds }),
    });
    if (response.ok) {
      await loadExams();
      setIsConfigOpen(false);
    }
    setIsSubmittingConfig(false);
  }

  const termOptions = useMemo(() => {
    return setup?.academicYears.flatMap(y => y.terms.map(t => ({ id: t.id, label: `${y.name} - ${t.name}` }))) ?? [];
  }, [setup]);

  return (
    <div className="space-y-6 pb-20">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border-subtle bg-background/50 py-6">
          <div className="space-y-1">
            <CardTitle className="text-xl">Examination Periods</CardTitle>
            <CardDescription>Schedule institutional assessments and configure class-wise subject scopes.</CardDescription>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={loadExams} className="h-10 px-6 font-bold uppercase text-[10px]">Refresh</Button>
            <PrimaryButton onClick={() => { resetForm(); setIsFormOpen(true); }} className="h-10 px-6 font-bold uppercase text-[10px]">New Exam</PrimaryButton>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingExams ? <p className="py-20 text-center text-[10px] font-black uppercase text-text-secondary animate-pulse">Synchronizing Data...</p> : (
            <Table>
              <TableHeader><TableRow className="bg-background/80">
                <TableHead className="py-3">Assessment Name</TableHead>
                <TableHead className="py-3">Term Cycle</TableHead>
                <TableHead className="py-3">Schedule</TableHead>
                <TableHead className="py-3 text-right pr-8">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam.id} className="group hover:bg-primary-light/5 transition-colors">
                    <TableCell className="py-2"><span className="text-[13px] font-black text-text-primary uppercase tracking-tight">{exam.name}</span></TableCell>
                    <TableCell className="py-2 text-[11px] font-bold text-text-secondary">{exam.term.academicYear.name} · {exam.term.name}</TableCell>
                    <TableCell className="py-2"><span className="text-[10px] font-black uppercase text-primary bg-primary-light/50 px-2 py-0.5 rounded-lg border border-primary/20">{new Date(exam.startDate).toLocaleDateString()}</span></TableCell>
                    <TableCell className="py-2 pr-8 text-right relative">
                      <button onClick={() => setOpenMenuId(openMenuId === exam.id ? null : exam.id)} className="rounded-xl p-2 text-text-secondary hover:bg-slate-100"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg></button>
                      {openMenuId === exam.id && (
                        <><div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-8 top-10 z-30 w-44 rounded-xl border border-border-subtle bg-card p-1 shadow-2xl dark:bg-card-dark text-left">
                          <button onClick={() => { handleEditExam(exam); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase text-text-primary hover:bg-primary-light/50 transition-colors">Edit Schedule</button>
                          <button onClick={() => { setConfigExamId(exam.id); setIsConfigOpen(true); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase text-secondary hover:bg-secondary-light/50 transition-colors">Manage Scope</button>
                        </div></>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog isOpen={isFormOpen} onClose={resetForm} size="lg" title={formMode === "create" ? "Create Assessment" : "Modify Schedule"}>
        <form className="space-y-6" onSubmit={handleExamSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <FormField label="Target Term Cycle"><Select value={examValues.termId} onChange={e => setExamValues(c => ({...c, termId: e.target.value}))} className="h-11"><option value="">Select cycle...</option>{termOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</Select></FormField>
            <FormField label="Assessment Name"><Input value={examValues.name} onChange={e => setExamValues(c => ({...c, name: e.target.value}))} placeholder="e.g. End of Term II" className="h-11 font-bold" /></FormField>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <FormField label="Start Date"><Input type="date" value={examValues.startDate} onChange={e => setExamValues(c => ({...c, startDate: e.target.value}))} className="h-11" /></FormField>
            <FormField label="Completion Date (Optional)"><Input type="date" value={examValues.endDate} onChange={e => setExamValues(c => ({...c, endDate: e.target.value}))} className="h-11" /></FormField>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-6">
            <Button type="button" variant="outline" onClick={resetForm} className="h-11 px-8 font-black uppercase tracking-widest text-[10px]">Cancel</Button>
            <PrimaryButton type="submit" disabled={isSubmittingExam} className="h-11 px-10 font-black uppercase tracking-widest text-[10px] shadow-soft">{isSubmittingExam ? "Processing..." : "Commit Assessment"}</PrimaryButton>
          </div>
        </form>
      </Dialog>

      <Dialog isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} size="xl" title="Subject Scope Configuration" description="Determine which classes and subjects are included in this assessment period.">
        <form className="space-y-8" onSubmit={handleConfigSubmit}>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1"><FormField label="Target Class"><Select value={selectedClassId} onChange={e => { setSelectedClassId(e.target.value); setSelectedSubjectIds([]); }} className="h-11 font-bold"><option value="">Choose class...</option>{setup?.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></FormField></div>
            <div className="lg:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60 mb-4 ml-1">Available Subjects</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {setup?.classes.find(c => c.id === selectedClassId)?.classSubjects.map(cs => {
                  const active = selectedSubjectIds.includes(cs.subject.id);
                  return (
                    <label key={cs.subject.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${active ? 'border-primary bg-primary-light/30 shadow-soft ring-2 ring-primary/5' : 'border-border-subtle hover:border-primary/20'}`}>
                      <input type="checkbox" checked={active} onChange={() => setSelectedSubjectIds(c => active ? c.filter(id => id !== cs.subject.id) : [...c, cs.subject.id])} className="h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary" />
                      <span className={`text-[11px] font-black uppercase tracking-tight ${active ? 'text-primary' : 'text-text-primary'}`}>{cs.subject.name} <span className="text-text-secondary/40 font-bold">({cs.subject.code})</span></span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-6">
            <Button type="button" variant="outline" onClick={() => setIsConfigOpen(false)} className="h-11 px-8 font-black uppercase tracking-widest text-[10px]">Close</Button>
            <PrimaryButton type="submit" disabled={isSubmittingConfig || !selectedSubjectIds.length} className="h-11 px-10 font-black uppercase tracking-widest text-[10px] shadow-soft">Update Scope</PrimaryButton>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
