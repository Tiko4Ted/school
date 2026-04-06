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
import { Dialog } from "@/components/ui/dialog";

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
  dateOfBirth?: string;
  classId?: string;
  streamId?: string;
};

type BulkPreviewRow = {
  index: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  classId: string;
  streamId: string;
  errors: string[];
  warnings: string[];
  valid: boolean;
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
      admissionNumber: z.string().trim().min(1, "student_id is required"),
      firstName: z.string().trim().min(1, "student_name is required"),
      lastName: z.string().trim(),
      gender: z.string().trim().optional(),
      dateOfBirth: z.string().trim().optional(),
      classId: z.string().uuid().optional(),
      streamId: z.string().uuid().optional(),
    }),
  ),
});

function formatDateForInput(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function StudentsManager() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(true);

  // Filter States
  const [filterClassId, setFilterClassId] = useState("all");
  const [filterStreamId, setFilterStreamId] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [classes, setClasses] = useState<SetupClass[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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

  const [lifecycleAction, setLifecycleAction] = useState<"none" | "transfer" | "graduate">("none");
  const [lifecycleDate, setLifecycleDate] = useState(new Date().toISOString().slice(0, 10));
  const [destinationSchool, setDestinationSchool] = useState("");
  const [isProcessingLifecycle, setIsProcessingLifecycle] = useState(false);

  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkTargetClassId, setBulkTargetClassId] = useState("");
  const [bulkTargetStreamId, setBulkTargetStreamId] = useState("");
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const [bulkPreview, setBulkPreview] = useState<{ valid: boolean; rows: BulkPreviewRow[] } | null>(null);
  const [bulkCommitSummary, setBulkCommitSummary] = useState<{
    total: number;
    created: number;
    updated: number;
    failed: number;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  useEffect(() => { void loadStudents(); }, [includeInactive]);
  useEffect(() => { void loadSetupData(); }, []);

  async function loadStudents() {
    setIsLoadingStudents(true);
    const res = await fetch(`/api/students?includeInactive=${includeInactive}`);
    const payload = await res.json();
    if (res.ok) setStudents(payload.data ?? []);
    setIsLoadingStudents(false);
  }

  async function loadSetupData() {
    const res = await fetch("/api/setup");
    const payload = await res.json();
    if (res.ok) setClasses(payload.data?.classes ?? []);
  }

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesClass = filterClassId === "all" || s.currentClass.id === filterClassId;
      const matchesStream = filterStreamId === "all" || s.currentStream.id === filterStreamId;
      const matchesStatus = filterStatus === "all" || s.status === filterStatus;
      const searchStr = `${s.firstName} ${s.lastName} ${s.admissionNumber}`.toLowerCase();
      return matchesClass && matchesStream && matchesStatus && (searchTerm.trim() === "" || searchStr.includes(searchTerm.toLowerCase()));
    });
  }, [students, filterClassId, filterStreamId, filterStatus, searchTerm]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  useEffect(() => { setCurrentPage(1); }, [filterClassId, filterStreamId, filterStatus, searchTerm]);

  const availableFilterStreams = useMemo(() => classes.find((cls) => cls.id === filterClassId)?.streams ?? [], [classes, filterClassId]);

  const availableStreams = useMemo(() => {
    const selectedClass = classes.find((cls) => cls.id === studentValues.currentClassId);
    return selectedClass?.streams ?? [];
  }, [classes, studentValues.currentClassId]);

  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter(s => s.status === 'ACTIVE').length;
    const promoted = students.filter(s => s.status === 'PROMOTED').length;
    const male = students.filter(s => s.gender === 'MALE').length;
    const female = students.filter(s => s.gender === 'FEMALE').length;
    const inactive = students.filter(s => s.status === 'GRADUATED' || s.status === 'TRANSFERRED').length;
    return { total, active, promoted, male, female, inactive };
  }, [students]);

  function resetStudentForm() {
    setFormMode("create");
    setEditingStudentId(null);
    setStudentValues({ admissionNumber: "", firstName: "", lastName: "", gender: "", dateOfBirth: "", currentClassId: "", currentStreamId: "" });
    setStudentFieldErrors({});
    setStudentFormError(null);
    setLifecycleAction("none");
    setIsFormOpen(false);
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
    setLifecycleAction("none");
    setIsFormOpen(true);
  }

  async function handleStudentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingStudent(true);
    const parsed = studentFormSchema.safeParse(studentValues);
    if (!parsed.success) {
      setStudentFieldErrors(parsed.error.flatten().fieldErrors as any);
      setIsSubmittingStudent(false);
      return;
    }
    const endpoint = formMode === "create" ? "/api/students" : `/api/students/${editingStudentId}`;
    const response = await fetch(endpoint, { method: formMode === "create" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
    if (response.ok) { await loadStudents(); resetStudentForm(); }
    setIsSubmittingStudent(false);
  }

  async function handleDeleteStudent(id: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    const response = await fetch(`/api/students/${id}`, { method: "DELETE" });
    if (response.ok) loadStudents();
  }

  async function handleLifecycleAction() {
    if (!editingStudentId || lifecycleAction === "none") return;
    setIsProcessingLifecycle(true);
    const response = await fetch(`/api/students?action=${lifecycleAction}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentIds: [editingStudentId], effectiveDate: lifecycleDate, destinationSchool }) });
    if (response.ok) { await loadStudents(); resetStudentForm(); }
    setIsProcessingLifecycle(false);
  }

  async function handleBulkFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseUploadFile(file, classes, bulkTargetClassId, bulkTargetStreamId);
      setBulkRows(rows);
      setBulkFileName(file.name);
    } catch (error) { setBulkError("Parse Error"); }
  }

  async function handleBulkPreview() {
    setIsPreviewing(true);
    const res = await fetch("/api/students?action=bulk-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: bulkRows }) });
    const payload = await res.json();
    setBulkPreview(payload.data);
    setIsPreviewing(false);
  }

  async function handleBulkCommit() {
    setIsCommitting(true);
    const res = await fetch("/api/students?action=bulk-commit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: bulkPreview?.rows ?? bulkRows }) });
    const payload = await res.json();
    setBulkCommitSummary(payload.data);
    setBulkRows([]);
    setBulkPreview(null);
    await loadStudents();
    setIsCommitting(false);
  }

  function downloadTemplate() {
    const headers = "student_id (ADM-YYYY-XXX),student_name,gender\nADM-2026-001,John Doe,M";
    const blob = new Blob([headers], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "template.csv";
    link.click();
  }

  function renderBulkPreviewTable() {
    if (!bulkRows.length) return null;
    return (
      <Card className="border-none shadow-soft"><CardHeader className="py-3 border-b border-border-subtle"><CardTitle className="text-xs uppercase tracking-widest text-text-secondary">File Data Preview</CardTitle></CardHeader>
        <CardContent className="p-0 max-h-48 overflow-y-auto">
          <Table><TableHeader><TableRow className="bg-background/80"><TableHead className="py-2 text-[9px] uppercase">ID</TableHead><TableHead className="py-2 text-[9px] uppercase">Name</TableHead><TableHead className="py-2 text-[9px] uppercase">Gender</TableHead></TableRow></TableHeader>
            <TableBody>{bulkRows.slice(0, 10).map((row, i) => (<TableRow key={i} className="group hover:bg-slate-50"><TableCell className="py-1.5 text-[10px] font-bold text-primary">{row.admissionNumber}</TableCell><TableCell className="py-1.5 text-[10px] font-black">{row.firstName} {row.lastName}</TableCell><TableCell className="py-1.5 text-[9px] uppercase font-bold text-text-secondary/60">{row.gender}</TableCell></TableRow>))}</TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-soft bg-primary text-white"><CardContent className="p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Total Enrollment</p>
          <p className="mt-1 text-3xl font-black">{stats.total}</p>
        </CardContent></Card>
        <Card className="border-none shadow-soft"><CardContent className="p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Gender (M/F)</p>
          <p className="mt-1 text-2xl font-black text-text-primary">{stats.male} / {stats.female}</p>
        </CardContent></Card>
        <Card className="border-none shadow-soft"><CardContent className="p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Active Students</p>
          <p className="mt-1 text-3xl font-black text-secondary">{stats.active}</p>
        </CardContent></Card>
        <Card className="border-none shadow-soft"><CardContent className="p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Promoted</p>
          <p className="mt-1 text-3xl font-black text-accent">{stats.promoted}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border-subtle bg-background/50 py-6">
          <div className="space-y-1"><CardTitle className="text-xl">Institutional Directory</CardTitle><CardDescription>Central repository for all student bio-data and lifecycle events.</CardDescription></div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={loadStudents} className="h-10 px-6 font-bold uppercase text-[10px]">Refresh</Button>
            <PrimaryButton onClick={() => { resetStudentForm(); setIsFormOpen(true); }} className="h-10 px-6 font-bold uppercase text-[10px] shadow-soft">Add Student</PrimaryButton>
            <Button variant="outline" onClick={() => setIsBulkOpen(true)} className="h-10 px-6 font-bold uppercase text-[10px] border-secondary text-secondary hover:bg-secondary-light/30">Bulk Upload</Button>
          </div>
        </CardHeader>
        <div className="border-b border-border-subtle bg-slate-50/50 p-4">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-2"><Input placeholder="Search records..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-9 text-xs" /></div>
            <Select value={filterClassId} onChange={e => { setFilterClassId(e.target.value); setFilterStreamId("all"); }} className="h-9 text-[10px] font-black uppercase"><option value="all">All Classes</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            <Select value={filterStreamId} onChange={e => setFilterStreamId(e.target.value)} disabled={filterClassId === "all"} className="h-9 text-[10px] font-black uppercase"><option value="all">All Streams</option>{availableFilterStreams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
            <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-9 text-[10px] font-black uppercase"><option value="all">Status</option><option value="ACTIVE">Active</option><option value="GRADUATED">Graduated</option></Select>
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-background/80"><TableHead className="py-2 text-[10px] uppercase">Admission</TableHead><TableHead className="py-2 text-[10px] uppercase">Name</TableHead><TableHead className="py-2 text-[10px] uppercase">Gender</TableHead><TableHead className="py-2 text-[10px] uppercase">Placement</TableHead><TableHead className="py-2 text-[10px] uppercase text-right pr-8">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {paginatedStudents.map((s) => (
                <TableRow key={s.id} className="group hover:bg-primary-light/5 transition-colors">
                  <TableCell className="py-1.5"><span className="text-[10px] font-black text-primary bg-primary-light/30 px-2 py-0.5 rounded border border-primary/20">{s.admissionNumber}</span></TableCell>
                  <TableCell className="py-1.5"><p className="text-[12px] font-black text-text-primary">{s.firstName} {s.lastName}</p></TableCell>
                  <TableCell className="py-1.5"><span className="text-[10px] font-bold text-text-secondary/40 uppercase">{s.gender}</span></TableCell>
                  <TableCell className="py-1.5"><p className="text-[11px] font-black text-text-primary uppercase tracking-tight">{s.currentClass.name} · {s.currentStream.name}</p></TableCell>
                  <TableCell className="py-1.5 pr-8 text-right relative">
                    <button onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)} className="rounded-xl p-2 text-text-secondary hover:bg-slate-100"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg></button>
                    {openMenuId === s.id && (
                      <><div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
                      <div className="absolute right-8 top-10 z-30 w-40 rounded-xl border border-border-subtle bg-card p-1 shadow-2xl dark:bg-card-dark text-left">
                        <button onClick={() => { handleEditStudent(s); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase text-text-primary hover:bg-primary-light/50 transition-colors">Edit Profile</button>
                        <button onClick={() => { handleDeleteStudent(s.id, s.firstName); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase text-error hover:bg-error/5 transition-colors">Delete</button>
                      </div></>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border-subtle bg-slate-50/30 px-8 py-3 dark:bg-slate-900/10">
            <p className="text-[10px] font-bold text-text-secondary uppercase">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2">
              <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} variant="outline" className="h-8 text-[9px] font-black uppercase">Prev</Button>
              <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} variant="outline" className="h-8 text-[9px] font-black uppercase">Next</Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog isOpen={isFormOpen} onClose={resetStudentForm} size="xl" title={formMode === "create" ? "Admission Portal" : "Student Profile Optimization"}>
        <form className="space-y-6" onSubmit={handleStudentSubmit}>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6"><h3 className="text-[10px] font-black uppercase text-text-secondary/60 tracking-widest">1. Bio-Data</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="First Name"><Input value={studentValues.firstName} onChange={e => setStudentValues(c => ({...c, firstName: e.target.value}))} className="h-10" /></FormField>
                <FormField label="Last Name"><Input value={studentValues.lastName} onChange={e => setStudentValues(c => ({...c, lastName: e.target.value}))} className="h-10" /></FormField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Gender"><Select value={studentValues.gender} onChange={e => setStudentValues(c => ({...c, gender: e.target.value as any}))} className="h-10"><option value="">Select...</option><option value="MALE">Male</option><option value="FEMALE">Female</option></Select></FormField>
                <FormField label="Birth Date"><Input type="date" value={studentValues.dateOfBirth} onChange={e => setStudentValues(c => ({...c, dateOfBirth: e.target.value}))} className="h-10" /></FormField>
              </div>
            </div>
            <div className="space-y-6"><h3 className="text-[10px] font-black uppercase text-text-secondary/60 tracking-widest">2. Placement</h3>
              <FormField label="Admission #"><Input value={studentValues.admissionNumber} onChange={e => setStudentValues(c => ({...c, admissionNumber: e.target.value}))} className="h-10 font-black text-primary" /></FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Class"><Select value={studentValues.currentClassId} onChange={e => setStudentValues(c => ({...c, currentClassId: e.target.value, currentStreamId: ""}))} className="h-10 font-bold"><option value="">Select...</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></FormField>
                <FormField label="Stream"><Select value={studentValues.currentStreamId} onChange={e => setStudentValues(c => ({...c, currentStreamId: e.target.value}))} disabled={!availableStreams.length} className="h-10 font-bold"><option value="">Select...</option>{availableStreams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></FormField>
              </div>
            </div>
          </div>
          {formMode === "edit" && (
            <div className="rounded-2xl border border-border-subtle bg-slate-50/30 p-4 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div className="flex-1 grid gap-4 sm:grid-cols-2">
                <FormField label="Lifecycle Type"><Select value={lifecycleAction} onChange={e => setLifecycleAction(e.target.value as any)} className="h-9 text-xs"><option value="none">Active</option><option value="transfer">Transfer</option><option value="graduate">Graduate</option></Select></FormField>
                <FormField label="Effective Date"><Input type="date" value={lifecycleDate} onChange={e => setLifecycleDate(e.target.value)} className="h-9 text-xs" /></FormField>
              </div>
              <Button variant="outline" onClick={handleLifecycleAction} className="h-9 px-6 font-black uppercase text-[10px] border-accent text-accent">Commit Action</Button>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-6 border-t border-border-subtle">
            <Button variant="outline" onClick={resetStudentForm} className="h-10 px-6 font-black uppercase text-[10px]">Cancel</Button>
            <PrimaryButton type="submit" className="h-10 px-10 font-black uppercase text-[10px] shadow-soft">Commit Record</PrimaryButton>
          </div>
        </form>
      </Dialog>

      <Dialog isOpen={isBulkOpen} onClose={() => { setIsBulkOpen(false); setBulkRows([]); setBulkPreview(null); }} size="xl" title="Mass Onboarding Portal">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl border border-border-subtle bg-slate-50/50">
            <div className="flex-1 grid gap-4 sm:grid-cols-2">
              <Select value={bulkTargetClassId} onChange={e => { setBulkTargetClassId(e.target.value); setBulkTargetStreamId(""); }} className="h-9 text-[10px] font-black uppercase"><option value="">Select Class...</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
              <Select value={bulkTargetStreamId} onChange={e => setBulkTargetStreamId(e.target.value)} disabled={!bulkTargetClassId} className="h-9 text-[10px] font-black uppercase"><option value="">Select Stream...</option>{classes.find(c => c.id === bulkTargetClassId)?.streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
            </div>
            <Button onClick={downloadTemplate} variant="outline" className="h-9 px-4 text-[10px] font-black uppercase border-primary text-primary bg-primary-light/30">Download Template</Button>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="relative group rounded-3xl border-2 border-dashed border-border-subtle bg-background/50 p-8 text-center transition hover:border-primary/40 hover:bg-primary-light/5">
                <label htmlFor="bulk-file" className={`cursor-pointer flex flex-col items-center ${!bulkTargetStreamId ? 'opacity-20' : ''}`}>
                  <div className="mb-2 rounded-xl bg-primary-light/20 p-3 text-primary group-hover:scale-110 shadow-soft"><svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                  <p className="text-xs font-black uppercase tracking-widest text-text-primary">Upload CSV / XLSX</p>
                </label>
                <input id="bulk-file" type="file" className="hidden" onChange={handleBulkFileChange} disabled={!bulkTargetStreamId} />
              </div>
              {bulkFileName && <div className="flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-card shadow-soft text-[10px] font-black uppercase"><span className="truncate">{bulkFileName}</span><span className="text-secondary">{bulkRows.length} Rows</span></div>}
              <Button onClick={handleBulkPreview} disabled={!bulkRows.length || isPreviewing} className="w-full h-10 font-black uppercase text-[10px]" variant="outline">Preview Upload</Button>
            </div>
            <div className="space-y-4">
              {renderBulkPreviewTable()}
              {bulkPreview && (
                <div className="space-y-4">
                  <div className={`p-3 rounded-xl border text-[10px] font-black uppercase text-center ${bulkPreview.valid ? 'bg-secondary-light/30 text-secondary border-secondary/20' : 'bg-warning/10 text-warning-dark border-warning/20'}`}>{bulkPreview.valid ? 'Ready to Commit' : 'Issues Found'}</div>
                  <PrimaryButton onClick={handleBulkCommit} disabled={!bulkPreview.valid || isCommitting} className="w-full h-11 font-black uppercase text-[10px] shadow-soft">Commit Data</PrimaryButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

async function parseUploadFile(file: File, classes: SetupClass[], tc?: string, ts?: string): Promise<BulkRow[]> {
  const content = file.name.endsWith(".csv") ? await file.text() : await file.arrayBuffer();
  const rows = file.name.endsWith(".csv") ? Papa.parse(content as string, { header: true }).data : XLSX.utils.sheet_to_json(XLSX.read(content, { type: "array" }).Sheets[XLSX.read(content, { type: "array" }).SheetNames[0]]);
  return normalizeBulkRows(rows as any, classes, tc, ts);
}

function normalizeBulkRows(rows: any[], classes: SetupClass[], tc?: string, ts?: string): BulkRow[] {
  return rows.map((r) => {
    const idKey = Object.keys(r).find(k => k.toLowerCase().startsWith("student_id")) || "student_id";
    const nameKey = Object.keys(r).find(k => k.toLowerCase().startsWith("student_name")) || "student_name";
    const genderKey = Object.keys(r).find(k => k.toLowerCase() === "gender") || "gender";
    const fn = String(r[nameKey] ?? "").trim();
    return { admissionNumber: String(r[idKey] ?? "").trim(), firstName: fn.split(/\s+/)[0] || "", lastName: fn.split(/\s+/).slice(1).join(" ") || "Student", gender: String(r[genderKey] ?? "").trim().toUpperCase(), classId: tc, streamId: ts };
  }).filter(r => r.admissionNumber && r.firstName);
}
