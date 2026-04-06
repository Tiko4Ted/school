"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink, PrimaryButton } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { z } from "zod";

type Stream = {
  id: string;
  name: string;
  isDefault: boolean;
  classTeacherAssignments: {
    teacher: { id: string; firstName: string; lastName: string };
  }[];
};

type TeacherShort = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
};

type Props = {
  classId: string;
  className: string;
};

const streamSchema = z.object({
  name: z.string().trim().min(1, "Stream name is required."),
  isDefault: z.boolean(),
  teacherId: z.string().uuid("Select a class teacher."),
});

export function StreamsTable({ classId, className }: Props) {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [teachers, setTeachers] = useState<TeacherShort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState({ name: "", isDefault: false, teacherId: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void loadStreams();
    void loadTeachers();
  }, [classId]);

  async function loadStreams() {
    setIsLoading(true);
    const response = await fetch(`/api/setup/streams?classId=${classId}`, { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setStreams(payload.data ?? []);
    setIsLoading(false);
  }

  async function loadTeachers() {
    const response = await fetch("/api/teachers", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) {
      setTeachers(payload.data?.map((t: any) => ({
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        employeeNumber: t.employeeNumber
      })) ?? []);
    }
  }

  function handleEdit(s: Stream) {
    setFormMode("edit");
    setEditingId(s.id);
    const currentTeacherId = s.classTeacherAssignments[0]?.teacher.id ?? "";
    setValues({ name: s.name, isDefault: s.isDefault, teacherId: currentTeacherId });
    setErrors({});
    setFormError(null);
    setIsFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    
    const parsed = streamSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors as any);
      return;
    }

    setIsSubmitting(true);
    const endpoint = formMode === "create" ? "/api/setup/streams" : `/api/setup/streams/${editingId}`;
    const method = formMode === "create" ? "POST" : "PATCH";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...parsed.data, classId }),
    });
    
    const payload = await response.json();
    if (response.ok) { 
      await loadStreams(); 
      setIsFormOpen(false); 
    } else {
      setFormError(payload.error ?? "Failed to save stream.");
    }
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border-subtle bg-background/50 py-6">
          <div className="space-y-1">
            <CardTitle className="text-xl">{className} · Streams</CardTitle>
            <CardDescription>Manage departmental streams and assigned Class Teachers.</CardDescription>
          </div>
          <div className="flex gap-3">
            <ButtonLink href={`/admin/classes/${classId}`} variant="outline" className="h-10 px-6 font-bold uppercase text-[10px]">Back to Class</ButtonLink>
            <PrimaryButton onClick={() => { setFormMode("create"); setValues({ name: "", isDefault: false, teacherId: "" }); setErrors({}); setFormError(null); setIsFormOpen(true); }} className="h-10 px-8 font-bold uppercase text-[10px]">Add Stream</PrimaryButton>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <p className="py-20 text-center text-[10px] font-black uppercase text-text-secondary animate-pulse">Loading Streams...</p> : (
            <Table>
              <TableHeader><TableRow className="bg-background/80">
                <TableHead className="py-3">Stream Name</TableHead>
                <TableHead className="py-3">Class Teacher</TableHead>
                <TableHead className="py-3">Designation</TableHead>
                <TableHead className="py-3 text-right pr-8">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {streams.map((s) => {
                  const classTeacher = s.classTeacherAssignments[0]?.teacher;
                  return (
                    <TableRow key={s.id} className="group hover:bg-primary-light/5 transition-colors">
                      <TableCell className="py-2"><span className="text-[13px] font-black text-text-primary uppercase tracking-tight">{s.name}</span></TableCell>
                      <TableCell className="py-2">
                        {classTeacher ? (
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-primary uppercase">{classTeacher.firstName} {classTeacher.lastName}</span>
                          </div>
                        ) : <span className="text-[10px] italic text-text-secondary/30">Unassigned</span>}
                      </TableCell>
                      <TableCell className="py-2">
                        {s.isDefault ? <span className="inline-flex rounded-lg bg-primary-light/50 text-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border border-primary/20">Default</span> : <span className="text-[9px] font-bold text-text-secondary/40 uppercase">Standard</span>}
                      </TableCell>
                      <TableCell className="py-2 pr-8 text-right relative">
                        <button onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)} className="rounded-xl p-2 text-text-secondary hover:bg-slate-100"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg></button>
                        {openMenuId === s.id && (
                          <><div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-8 top-10 z-30 w-44 rounded-xl border border-border-subtle bg-card p-1 shadow-2xl dark:bg-card-dark text-left">
                            <button onClick={() => { handleEdit(s); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase text-text-primary hover:bg-primary-light/50 transition-colors">Edit Stream / Swap Teacher</button>
                          </div></>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} size="lg" title={formMode === "create" ? "Add Stream" : "Update Stream & Class Teacher"}>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <FormField label="Stream Identity" error={errors.name}><Input value={values.name} onChange={e => setValues(c => ({...c, name: e.target.value}))} placeholder="e.g. North" className="h-11 font-bold" /></FormField>
            <FormField label="Class Teacher" error={errors.teacherId}>
              <Select value={values.teacherId} onChange={e => setValues(c => ({...c, teacherId: e.target.value}))} className="h-11 font-bold">
                <option value="">Choose teacher...</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.employeeNumber})</option>)}
              </Select>
            </FormField>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border-subtle bg-slate-50/50">
            <input type="checkbox" id="isDefault" checked={values.isDefault} onChange={e => setValues(c => ({...c, isDefault: e.target.checked}))} className="h-5 w-5 rounded border-border-subtle text-primary" />
            <label htmlFor="isDefault" className="text-xs font-black uppercase tracking-widest text-text-secondary">Set as Default Stream</label>
          </div>
          
          {formError && <div className="rounded-xl border border-error/20 bg-error/5 p-3 text-[10px] font-black uppercase text-error text-center">{formError}</div>}

          <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-6">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="h-11 px-8 font-black uppercase text-[10px]">Cancel</Button>
            <PrimaryButton type="submit" disabled={isSubmitting} className="h-11 px-10 font-black uppercase text-[10px] shadow-soft">{isSubmitting ? "Processing..." : "Commit Stream"}</PrimaryButton>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
