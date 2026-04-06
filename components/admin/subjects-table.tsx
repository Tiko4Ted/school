"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, PrimaryButton } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { z } from "zod";

type Subject = {
  id: string;
  name: string;
  code: string;
};

const subjectSchema = z.object({
  name: z.string().trim().min(2, "Subject name is required."),
  code: z.string().trim().min(1, "Subject code is required."),
});

export function SubjectsTable() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState({ name: "", code: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { void loadSubjects(); }, []);

  async function loadSubjects() {
    setIsLoading(true);
    const response = await fetch("/api/setup/subjects", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setSubjects(payload.data ?? []);
    setIsLoading(false);
  }

  function handleEdit(s: Subject) {
    setFormMode("edit");
    setEditingId(s.id);
    setValues({ name: s.name, code: s.code });
    setIsFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const endpoint = formMode === "create" ? "/api/setup/subjects" : `/api/setup/subjects/${editingId}`;
    const method = formMode === "create" ? "POST" : "PATCH";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (response.ok) { await loadSubjects(); setIsFormOpen(false); }
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border-subtle bg-background/50 py-6">
          <div className="space-y-1">
            <CardTitle className="text-xl">Academic Subjects</CardTitle>
            <CardDescription>Official registry of subjects and their institutional codes.</CardDescription>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={loadSubjects} className="h-10 px-6 font-bold uppercase text-[10px]">Refresh</Button>
            <PrimaryButton onClick={() => { setFormMode("create"); setValues({ name: "", code: "" }); setIsFormOpen(true); }} className="h-10 px-8 font-bold uppercase text-[10px]">Add Subject</PrimaryButton>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <p className="py-20 text-center text-[10px] font-black uppercase text-text-secondary animate-pulse">Loading Registry...</p> : (
            <Table>
              <TableHeader><TableRow className="bg-background/80">
                <TableHead className="py-3">Subject Identity</TableHead>
                <TableHead className="py-3">Official Code</TableHead>
                <TableHead className="py-3 text-right pr-8">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {subjects.map((s) => (
                  <TableRow key={s.id} className="group hover:bg-primary-light/5 transition-colors">
                    <TableCell className="py-2"><span className="text-[13px] font-black text-text-primary uppercase tracking-tight">{s.name}</span></TableCell>
                    <TableCell className="py-2"><span className="text-[10px] font-black text-primary bg-primary-light/50 px-2 py-0.5 rounded-lg border border-primary/20">{s.code}</span></TableCell>
                    <TableCell className="py-2 pr-8 text-right relative">
                      <button onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)} className="rounded-xl p-2 text-text-secondary hover:bg-slate-100"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg></button>
                      {openMenuId === s.id && (
                        <><div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-8 top-10 z-30 w-40 rounded-xl border border-border-subtle bg-card p-1 shadow-2xl dark:bg-card-dark text-left">
                          <button onClick={() => { handleEdit(s); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase text-text-primary hover:bg-primary-light/50 transition-colors">Edit Details</button>
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

      <Dialog isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} size="lg" title={formMode === "create" ? "Register Subject" : "Modify Subject Details"}>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2"><FormField label="Subject Name"><Input value={values.name} onChange={e => setValues(c => ({...c, name: e.target.value}))} placeholder="e.g. Mathematics" className="h-11 font-bold" /></FormField></div>
            <FormField label="Code"><Input value={values.code} onChange={e => setValues(c => ({...c, code: e.target.value}))} placeholder="e.g. MAT" className="h-11 font-bold text-primary" /></FormField>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-6">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="h-11 px-8 font-black uppercase text-[10px]">Cancel</Button>
            <PrimaryButton type="submit" disabled={isSubmitting} className="h-11 px-10 font-black uppercase text-[10px] shadow-soft">Save Subject</PrimaryButton>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
