"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, PrimaryButton, ButtonLink } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { z } from "zod";

type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const yearSchema = z.object({
  name: z.string().trim().min(4, "Year name is required."),
  startDate: z.string().trim().min(1, "Start date is required."),
  endDate: z.string().trim().min(1, "End date is required."),
  isActive: z.boolean(),
});

export function AcademicYearsTable() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingYearId, setEditingYearId] = useState<string | null>(null);
  const [values, setValues] = useState({ name: "", startDate: "", endDate: "", isActive: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { void loadYears(); }, []);

  async function loadYears() {
    setIsLoading(true);
    const response = await fetch("/api/setup/academicyears", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setYears(payload.data ?? []);
    setIsLoading(false);
  }

  function resetForm() {
    setValues({ name: "", startDate: "", endDate: "", isActive: false });
    setErrors({});
    setIsFormOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const parsed = yearSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors as any);
      setIsSubmitting(false);
      return;
    }

    const endpoint = formMode === "create" ? "/api/setup/academicyears" : `/api/setup/academicyears/${editingYearId}`;
    const method = formMode === "create" ? "POST" : "PATCH";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    if (response.ok) {
      await loadYears();
      resetForm();
    }
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border-subtle bg-background/50 py-6">
          <div className="space-y-1">
            <CardTitle className="text-xl">Academic Calendar</CardTitle>
            <CardDescription>Manage institutional year cycles and active operational periods.</CardDescription>
          </div>
          <PrimaryButton onClick={() => { setFormMode("create"); setIsFormOpen(true); }} className="h-10 px-8 font-bold uppercase text-[10px]">Open New Year</PrimaryButton>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <p className="py-20 text-center text-[10px] font-black uppercase text-text-secondary animate-pulse">Loading Calendar...</p> : (
            <Table>
              <TableHeader><TableRow className="bg-background/80">
                <TableHead className="py-3">Institutional Year</TableHead>
                <TableHead className="py-3">Start Date</TableHead>
                <TableHead className="py-3">End Date</TableHead>
                <TableHead className="py-3">Status</TableHead>
                <TableHead className="py-3 text-right pr-8">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {years.map((year) => (
                  <TableRow key={year.id} className="group hover:bg-primary-light/5 transition-colors">
                    <TableCell className="py-2"><span className="text-[13px] font-black text-text-primary uppercase tracking-tight">{year.name}</span></TableCell>
                    <TableCell className="py-2 text-[11px] font-medium text-text-secondary">{new Date(year.startDate).toLocaleDateString()}</TableCell>
                    <TableCell className="py-2 text-[11px] font-medium text-text-secondary">{new Date(year.endDate).toLocaleDateString()}</TableCell>
                    <TableCell className="py-2">
                      <span className={`inline-flex rounded-lg px-2 py-0.5 text-[9px] font-black uppercase border ${year.isActive ? 'bg-secondary-light/50 text-secondary border-secondary/20' : 'bg-background text-text-secondary border-border-subtle'}`}>
                        {year.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 pr-8 text-right relative">
                      <button onClick={() => setOpenMenuId(openMenuId === year.id ? null : year.id)} className="rounded-xl p-2 text-text-secondary hover:bg-slate-100"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg></button>
                      {openMenuId === year.id && (
                        <><div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-8 top-10 z-30 w-40 rounded-xl border border-border-subtle bg-card p-1 shadow-2xl dark:bg-card-dark text-left">
                          <ButtonLink href={`/admin/academicyears/${year.id}/terms`} variant="outline" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase text-primary hover:bg-primary-light/50">Manage Terms</ButtonLink>
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

      <Dialog isOpen={isFormOpen} onClose={resetForm} size="lg" title={formMode === "create" ? "Add Academic Year" : "Edit Calendar Year"}>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <FormField label="Academic Year Name" error={errors.name}><Input value={values.name} onChange={e => setValues(c => ({...c, name: e.target.value}))} placeholder="e.g. 2026" className="h-11 font-bold" /></FormField>
          <div className="grid gap-6 md:grid-cols-2">
            <FormField label="Official Start" error={errors.startDate}><Input type="date" value={values.startDate} onChange={e => setValues(c => ({...c, startDate: e.target.value}))} className="h-11" /></FormField>
            <FormField label="Official End" error={errors.endDate}><Input type="date" value={values.endDate} onChange={e => setValues(c => ({...c, endDate: e.target.value}))} className="h-11" /></FormField>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-6">
            <Button type="button" variant="outline" onClick={resetForm} className="h-11 px-8 font-black uppercase text-[10px]">Cancel</Button>
            <PrimaryButton type="submit" disabled={isSubmitting} className="h-11 px-10 font-black uppercase text-[10px] shadow-soft">Save Calendar</PrimaryButton>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
