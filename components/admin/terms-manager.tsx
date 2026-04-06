"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink, PrimaryButton } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";

type Term = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

type Props = {
  academicYearId: string;
  academicYearName: string;
};

export function TermsManager({ academicYearId, academicYearName }: Props) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState({ name: "", startDate: "", endDate: "", isActive: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { void loadTerms(); }, [academicYearId]);

  async function loadTerms() {
    setIsLoading(true);
    const res = await fetch(`/api/setup/terms?academicYearId=${academicYearId}`, { cache: "no-store" });
    const payload = await res.json();
    if (res.ok) setTerms(payload.data ?? []);
    setIsLoading(false);
  }

  function handleEdit(t: Term) {
    setFormMode("edit");
    setEditingId(t.id);
    setValues({ name: t.name, startDate: t.startDate.split('T')[0], endDate: t.endDate.split('T')[0], isActive: t.isActive });
    setIsFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const endpoint = formMode === "create" ? "/api/setup/terms" : `/api/setup/terms/${editingId}`;
    const method = formMode === "create" ? "POST" : "PATCH";
    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, academicYearId }),
    });
    if (res.ok) { await loadTerms(); setIsFormOpen(false); }
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border-subtle bg-background/50 py-6">
          <div className="space-y-1">
            <CardTitle className="text-xl">{academicYearName} · Operational Terms</CardTitle>
            <CardDescription>Define institutional session periods and active reporting windows.</CardDescription>
          </div>
          <div className="flex gap-3">
            <ButtonLink href="/admin/academicyears" variant="outline" className="h-10 px-6 font-bold uppercase text-[10px]">Back to Years</ButtonLink>
            <PrimaryButton onClick={() => { setFormMode("create"); setValues({ name: "", startDate: "", endDate: "", isActive: false }); setIsFormOpen(true); }} className="h-10 px-8 font-bold uppercase text-[10px]">Add Term</PrimaryButton>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <p className="py-20 text-center text-[10px] font-black uppercase text-text-secondary animate-pulse">Loading Terms...</p> : (
            <Table>
              <TableHeader><TableRow className="bg-background/80">
                <TableHead className="py-3">Term Identity</TableHead>
                <TableHead className="py-3">Period</TableHead>
                <TableHead className="py-3">Status</TableHead>
                <TableHead className="py-3 text-right pr-8">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {terms.map((t) => (
                  <TableRow key={t.id} className="group hover:bg-primary-light/5 transition-colors">
                    <TableCell className="py-2"><span className="text-[13px] font-black text-text-primary uppercase tracking-tight">{t.name}</span></TableCell>
                    <TableCell className="py-2"><span className="text-[11px] font-bold text-text-secondary">{new Date(t.startDate).toLocaleDateString()} — {new Date(t.endDate).toLocaleDateString()}</span></TableCell>
                    <TableCell className="py-2">
                      <span className={`inline-flex rounded-lg px-2 py-0.5 text-[9px] font-black uppercase border ${t.isActive ? 'bg-secondary-light/50 text-secondary border-secondary/20' : 'bg-background text-text-secondary border-border-subtle'}`}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 pr-8 text-right relative">
                      <button onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)} className="rounded-xl p-2 text-text-secondary hover:bg-slate-100"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg></button>
                      {openMenuId === t.id && (
                        <><div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-8 top-10 z-30 w-40 rounded-xl border border-border-subtle bg-card p-1 shadow-2xl dark:bg-card-dark text-left">
                          <button onClick={() => { handleEdit(t); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase text-text-primary hover:bg-primary-light/50 transition-colors">Edit Term</button>
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

      <Dialog isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} size="lg" title={formMode === "create" ? "Add Operational Term" : "Edit Term Details"}>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <FormField label="Term Designation"><Input value={values.name} onChange={e => setValues(c => ({...c, name: e.target.value}))} placeholder="e.g. Term I" className="h-11 font-bold" /></FormField>
          <div className="grid gap-6 md:grid-cols-2">
            <FormField label="Start Date"><Input type="date" value={values.startDate} onChange={e => setValues(c => ({...c, startDate: e.target.value}))} className="h-11" /></FormField>
            <FormField label="End Date"><Input type="date" value={values.endDate} onChange={e => setValues(c => ({...c, endDate: e.target.value}))} className="h-11" /></FormField>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border-subtle bg-slate-50/50">
            <input type="checkbox" id="isActiveTerm" checked={values.isActive} onChange={e => setValues(c => ({...c, isActive: e.target.checked}))} className="h-5 w-5 rounded border-border-subtle text-primary" />
            <label htmlFor="isActiveTerm" className="text-xs font-black uppercase tracking-widest text-text-secondary">Mark as Active Reporting Term</label>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-6">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="h-11 px-8 font-black uppercase text-[10px]">Cancel</Button>
            <PrimaryButton type="submit" disabled={isSubmitting} className="h-11 px-10 font-black uppercase text-[10px] shadow-soft">Save Term</PrimaryButton>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
