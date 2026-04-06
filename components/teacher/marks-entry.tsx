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

export function TeacherMarksEntry() {
  const [options, setOptions] = useState<TeacherOptionsResponse | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [studentsResponse, setStudentsResponse] = useState<StudentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Excel-style direct entry state
  const [draftMarks, setDraftMarks] = useState<Record<string, string>>({});
  const [isBulkPending, startBulkTransition] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);

  useEffect(() => { void loadOptions(); }, []);

  async function loadOptions() {
    setOptionsLoading(true);
    const res = await fetch("/api/marks?view=teacher-options");
    const payload = await res.json();
    if (res.ok) setOptions(payload.data);
    setOptionsLoading(false);
  }

  const selectedAssignment = useMemo(() => options?.assignments.find(a => a.id === selectedAssignmentId), [options, selectedAssignmentId]);
  const examChoices = useMemo(() => options?.exams.filter(e => e.configurations.some(c => c.classId === selectedAssignment?.stream.class.id && c.subjectId === selectedAssignment?.subject.id)) ?? [], [options, selectedAssignment]);

  useEffect(() => {
    if (selectedAssignment && selectedExamId) void loadStudents(selectedExamId, selectedAssignment.stream.id, selectedAssignment.subject.id);
    else setStudentsResponse(null);
  }, [selectedExamId, selectedAssignment]);

  async function loadStudents(examId: string, streamId: string, subjectId: string) {
    setIsLoading(true);
    setBulkError(null);
    setBulkSuccess(null);
    const res = await fetch(`/api/marks?view=teacher-students&examId=${examId}&streamId=${streamId}&subjectId=${subjectId}`);
    const payload = await res.json();
    if (res.ok) {
      setStudentsResponse(payload.data);
      // Initialize draft marks from existing data
      const initials: Record<string, string> = {};
      payload.data.students.forEach((s: StudentMarkRow) => {
        initials[s.id] = s.existingScore !== null ? String(s.existingScore) : "";
      });
      setDraftMarks(initials);
    }
    setIsLoading(false);
  }

  function handleMarkChange(studentId: string, value: string) {
    setDraftMarks(prev => ({ ...prev, [studentId]: value }));
    setBulkError(null);
    setBulkSuccess(null);
  }

  async function handleBatchSave() {
    if (!selectedAssignment || !selectedExamId || !studentsResponse) return;
    
    // Prepare rows for submission (only students with non-empty marks)
    const rows = studentsResponse.students
      .map(s => ({
        studentId: s.id,
        score: Number(draftMarks[s.id])
      }))
      .filter(r => !isNaN(r.score) && draftMarks[r.studentId] !== "");

    if (rows.length === 0) {
      setBulkError("No marks entered to save.");
      return;
    }

    startBulkTransition(async () => {
      const result = await submitBulkMarks({
        examId: selectedExamId,
        streamId: selectedAssignment.stream.id,
        subjectId: selectedAssignment.subject.id,
        rows
      });

      if (result.success) {
        setBulkSuccess(`Successfully saved ${rows.length} marks.`);
        loadStudents(selectedExamId, selectedAssignment.stream.id, selectedAssignment.subject.id);
      } else {
        setBulkError(result.error || "Batch save failed.");
      }
    });
  }

  function downloadTemplate() {
    if (!studentsResponse || !selectedAssignment) return;
    const subjectName = selectedAssignment.subject.name.toUpperCase().replace(/\s+/g, '_');
    const headers = ["admission_number", "student_name", `score_${subjectName}`];
    const rows = studentsResponse.students.map(s => [s.admissionNumber, `${s.firstName} ${s.lastName}`, s.existingScore ?? ""]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `marks_template_${selectedAssignment.stream.name}_${selectedAssignment.subject.code}.csv`;
    link.click();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    
    if (result.errors.length) { setBulkError("CSV Parse Error"); return; }

    const subjectName = selectedAssignment?.subject.name.toUpperCase().replace(/\s+/g, '_');
    const scoreKey = `score_${subjectName}`;
    const newDrafts = { ...draftMarks };
    
    (result.data as any[]).forEach(row => {
      const adm = String(row.admission_number || "").trim();
      const score = row[scoreKey] || row.score;
      const student = studentsResponse?.students.find(s => s.admissionNumber === adm);
      if (student && score !== undefined && !isNaN(Number(score))) {
        newDrafts[student.id] = String(score);
      }
    });
    setDraftMarks(newDrafts);
    setBulkSuccess("File data loaded into the grid. Click 'Commit All' to save.");
  }

  return (
    <div className="space-y-6 pb-20">
      <Card className="border-none shadow-soft overflow-visible">
        <CardContent className="p-6">
          {optionsLoading ? (
            <div className="py-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary animate-pulse">Initializing Portal Assignments...</p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row lg:items-end gap-6">
              <div className="flex-1 grid gap-6 md:grid-cols-2">
                <FormField label="Staff Assignment">
                  <Select value={selectedAssignmentId} onChange={e => { setSelectedAssignmentId(e.target.value); setSelectedExamId(""); }} className="h-11 font-bold">
                    <option value="">Choose assignment...</option>
                    {options?.assignments.map(a => <option key={a.id} value={a.id}>{a.stream.class.name} {a.stream.name} · {a.subject.name}</option>)}
                  </Select>
                </FormField>
                <FormField label="Target Assessment">
                  <Select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)} disabled={!selectedAssignment} className="h-11 font-bold">
                    <option value="">Choose exam...</option>
                    {examChoices.map(e => <option key={e.id} value={e.id}>{e.name} ({e.term.name})</option>)}
                  </Select>
                </FormField>
              </div>
              
              <div className="shrink-0 min-w-[220px]">
                <Button 
                  onClick={downloadTemplate} 
                  disabled={!studentsResponse || isLoading}
                  variant="outline" 
                  className={`w-full h-11 px-6 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-soft transition-all ${studentsResponse && !isLoading ? 'border-primary text-primary bg-primary-light/30 hover:bg-primary-light/50 opacity-100' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Download List
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {studentsResponse && (
        <Card className="border-none shadow-soft">
          <CardHeader className="py-6 border-b border-border-subtle bg-background/50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                <div>
                  <CardTitle className="text-lg uppercase tracking-tight">Direct Mark Entry</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase text-text-secondary/60">Subject: {selectedAssignment?.subject.name} · Stream: {selectedAssignment?.stream.name}</CardDescription>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <label className={`h-10 px-6 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border-2 border-dashed border-secondary/30 text-secondary bg-secondary-light/10 hover:bg-secondary-light/30 rounded-xl cursor-pointer transition-all ${studentsResponse.reviewLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  Import CSV
                </label>
                <PrimaryButton 
                  onClick={handleBatchSave} 
                  disabled={isBulkPending || studentsResponse.reviewLocked}
                  className="h-10 px-10 font-black uppercase text-[10px] tracking-widest shadow-soft"
                >
                  {isBulkPending ? "Saving..." : "Commit All Changes"}
                </PrimaryButton>
              </div>
            </div>
            
            {(bulkError || bulkSuccess) && (
              <div className={`mt-4 p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest text-center ${bulkError ? 'bg-error/5 text-error border-error/20' : 'bg-secondary-light/30 text-secondary border-secondary/20'}`}>
                {bulkError || bulkSuccess}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="bg-background/80">
                <TableHead className="py-3 w-32">Admission</TableHead>
                <TableHead className="py-3">Student Full Name</TableHead>
                <TableHead className="py-3 text-right pr-12 w-48">Score (0-100)</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {studentsResponse.students.map((s) => (
                  <TableRow key={s.id} className="group hover:bg-primary-light/5 transition-colors">
                    <TableCell className="py-2.5 font-black text-[11px] text-text-secondary/60 tracking-tighter">{s.admissionNumber}</TableCell>
                    <TableCell className="py-2.5">
                      <p className="font-extrabold text-text-primary text-[13px] uppercase tracking-tight">{s.firstName} {s.lastName}</p>
                    </TableCell>
                    <TableCell className="py-2.5 text-right pr-8">
                      <div className="flex justify-end">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={draftMarks[s.id] ?? ""}
                          onChange={(e) => handleMarkChange(s.id, e.target.value)}
                          disabled={studentsResponse.reviewLocked}
                          className={`w-24 h-9 text-right font-black text-xs transition-all ${draftMarks[s.id] !== (s.existingScore !== null ? String(s.existingScore) : "") ? 'border-primary ring-2 ring-primary/5 bg-primary-light/10' : ''}`}
                          placeholder="—"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
