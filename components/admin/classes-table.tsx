"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, PrimaryButton, ButtonLink } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { z } from "zod";

type SchoolClass = {
  id: string;
  name: string;
  level: number;
  hasStreams: boolean;
  nextClass: { id: string; name: string } | null;
};

const classSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  level: z.coerce.number().int().positive(),
  hasStreams: z.boolean(),
  nextClassId: z.string().uuid().optional().nullable(),
});

export function ClassesTable() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState({ name: "", level: 1, hasStreams: true, nextClassId: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { void loadClasses(); }, []);

  async function loadClasses() {
    setIsLoading(true);
    const response = await fetch("/api/setup/classes", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setClasses(payload.data ?? []);
    setIsLoading(false);
  }

  function handleEdit(c: SchoolClass) {
    setFormMode("edit");
    setEditingId(c.id);
    setValues({ name: c.name, level: c.level, hasStreams: c.hasStreams, nextClassId: c.nextClass?.id ?? "" });
    setIsFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const endpoint = formMode === "create" ? "/api/setup/classes" : `/api/setup/classes/${editingId}`;
    const response = await fetch(endpoint, {
      method: formMode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, nextClassId: values.nextClassId || null }),
    });
    if (response.ok) { await loadClasses(); setIsFormOpen(false); }
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border-subtle bg-background/50 py-6">
          <div className="space-y-1">
            <CardTitle className="text-xl">Institutional Classes</CardTitle>
            <CardDescription>Configure class levels, stream behavior, and academic progression.</CardDescription>
          </div>
          <PrimaryButton onClick={() => { setFormMode("create"); setValues({ name: "", level: 1, hasStreams: true, nextClassId: "" }); setIsFormOpen(true); }} className="h-10 px-8 font-bold uppercase text-[10px]">Create Class</PrimaryButton>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <p className="py-20 text-center text-[10px] font-black uppercase text-text-secondary animate-pulse">Synchronizing Levels...</p> : (
            <Table>
              <TableHeader><TableRow className="bg-background/80">
                <TableHead className="py-3">Class Identity</TableHead>
                <TableHead className="py-3">Level</TableHead>
                <TableHead className="py-3">Streams</TableHead>
                <TableHead className="py-3">Progression</TableHead>
                <TableHead className="py-3 text-right pr-8">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {classes.map((c) => (
                  <TableRow key={c.id} className="group hover:bg-primary-light/5 transition-colors">
                    <TableCell className="py-2"><span className="text-[13px] font-black text-text-primary uppercase tracking-tight">{c.name}</span></TableCell>
                    <TableCell className="py-2"><span className="text-[11px] font-bold text-text-secondary">Level {c.level}</span></TableCell>
                    <TableCell className="py-2">
                      <span className={`inline-flex rounded-lg px-2 py-0.5 text-[9px] font-black uppercase border ${c.hasStreams ? 'bg-secondary-light/50 text-secondary border-secondary/20' : 'bg-background text-text-secondary border-border-subtle'}`}>
                        {c.hasStreams ? 'Enabled' : 'Disabled'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2"><span className="text-[11px] font-medium text-text-secondary">{c.nextClass?.name ?? 'Terminal'}</span></TableCell>
                    <TableCell className="py-2 pr-8 text-right relative">
                      <button onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)} className="rounded-xl p-2 text-text-secondary hover:bg-slate-100"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg></button>
                      {openMenuId === c.id && (
                        <><div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-8 top-10 z-30 w-44 rounded-xl border border-border-subtle bg-card p-1 shadow-2xl dark:bg-card-dark text-left">
                          <button onClick={() => { handleEdit(c); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase text-text-primary hover:bg-primary-light/50 transition-colors">Edit Class</button>
                          <ButtonLink href={`/admin/classes/${c.id}/subjects`} variant="outline" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase text-accent hover:bg-accent-light/50 border-none h-auto">Manage Subjects</ButtonLink>
                          {c.hasStreams && <ButtonLink href={`/admin/classes/${c.id}/streams`} variant="outline" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase text-secondary hover:bg-secondary-light/50 border-none h-auto">Manage Streams</ButtonLink>}
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

      <Dialog isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} size="lg" title={formMode === "create" ? "Register New Class" : "Edit Class Configuration"}>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <FormField label="Class Name"><Input value={values.name} onChange={e => setValues(c => ({...c, name: e.target.value}))} placeholder="e.g. Form 1" className="h-11 font-bold" /></FormField>
            <FormField label="Level Indicator"><Input type="number" value={values.level} onChange={e => setValues(c => ({...c, level: parseInt(e.target.value)}))} className="h-11" /></FormField>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <FormField label="Next Progression"><Select value={values.nextClassId} onChange={e => setValues(c => ({...c, nextClassId: e.target.value}))} className="h-11"><option value="">No progression...</option>{classes.filter(c => c.id !== editingId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></FormField>
            <div className="flex items-center gap-3 h-11 pt-6"><input type="checkbox" id="hasStreams" checked={values.hasStreams} onChange={e => setValues(c => ({...c, hasStreams: e.target.checked}))} className="h-5 w-5 rounded border-border-subtle text-primary" /><label htmlFor="hasStreams" className="text-xs font-bold uppercase tracking-widest text-text-secondary">Enable Streams</label></div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-6">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="h-11 px-8 font-black uppercase text-[10px]">Cancel</Button>
            <PrimaryButton type="submit" disabled={isSubmitting} className="h-11 px-10 font-black uppercase text-[10px] shadow-soft">Save Class</PrimaryButton>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
