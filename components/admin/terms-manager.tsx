"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

type EditableTerm = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

function normalizeDate(value: string) {
  return value.slice(0, 10);
}

export function TermsManager({ academicYearId, academicYearName }: Props) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTerm, setNewTerm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    isActive: false,
  });
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<EditableTerm | null>(null);

  async function loadTerms() {
    const response = await fetch(`/api/setup/terms?academicYearId=${academicYearId}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { data?: Term[]; error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Failed to load terms.");
      setIsLoading(false);
      return;
    }

    setTerms(payload?.data ?? []);
    setError(null);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadTerms();
  }, [academicYearId]);

  async function handleCreateTerm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsCreating(true);

    const response = await fetch("/api/setup/terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        academicYearId,
        ...newTerm,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Failed to create term.");
      setIsCreating(false);
      return;
    }

    setNewTerm({ name: "", startDate: "", endDate: "", isActive: false });
    setIsCreating(false);
    void loadTerms();
  }

  function startEditing(term: Term) {
    setEditingTermId(term.id);
    setEditingValues({
      id: term.id,
      name: term.name,
      startDate: normalizeDate(term.startDate),
      endDate: normalizeDate(term.endDate),
      isActive: term.isActive,
    });
  }

  async function saveEdit() {
    if (!editingValues) {
      return;
    }

    setError(null);
    const response = await fetch(`/api/setup/terms/${editingValues.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editingValues.name,
        startDate: editingValues.startDate,
        endDate: editingValues.endDate,
        isActive: editingValues.isActive,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Failed to update term.");
      return;
    }

    setEditingTermId(null);
    setEditingValues(null);
    void loadTerms();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-6xl space-y-6">
        <Card className="border-slate-200 bg-white/95">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Terms</p>
              <CardTitle className="text-3xl">{academicYearName}</CardTitle>
              <CardDescription className="text-base">
                Create and edit terms for this academic year.
              </CardDescription>
            </div>
            <ButtonLink href="/admin/academicyears">Back to Academic Years</ButtonLink>
          </CardHeader>
          <CardContent className="space-y-8">
            <form className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-5" onSubmit={handleCreateTerm}>
              <input
                placeholder="Term name"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                value={newTerm.name}
                onChange={(event) => setNewTerm((current) => ({ ...current, name: event.target.value }))}
              />
              <input
                type="date"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                value={newTerm.startDate}
                onChange={(event) => setNewTerm((current) => ({ ...current, startDate: event.target.value }))}
              />
              <input
                type="date"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                value={newTerm.endDate}
                onChange={(event) => setNewTerm((current) => ({ ...current, endDate: event.target.value }))}
              />
              <label className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={newTerm.isActive}
                  onChange={(event) => setNewTerm((current) => ({ ...current, isActive: event.target.checked }))}
                />
                Active
              </label>
              <button
                type="submit"
                disabled={isCreating}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCreating ? "Creating..." : "Create Term"}
              </button>
            </form>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {isLoading ? <p className="text-sm text-slate-600">Loading terms...</p> : null}

            {!isLoading ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Start</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">End</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Active</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {terms.map((term) => {
                      const isEditing = editingTermId === term.id && editingValues;

                      return (
                        <tr key={term.id}>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500"
                                value={editingValues.name}
                                onChange={(event) =>
                                  setEditingValues((current) => (current ? { ...current, name: event.target.value } : current))
                                }
                              />
                            ) : (
                              <span className="text-slate-900">{term.name}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input
                                type="date"
                                className="rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500"
                                value={editingValues.startDate}
                                onChange={(event) =>
                                  setEditingValues((current) =>
                                    current ? { ...current, startDate: event.target.value } : current,
                                  )
                                }
                              />
                            ) : (
                              <span className="text-slate-700">{normalizeDate(term.startDate)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input
                                type="date"
                                className="rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500"
                                value={editingValues.endDate}
                                onChange={(event) =>
                                  setEditingValues((current) => (current ? { ...current, endDate: event.target.value } : current))
                                }
                              />
                            ) : (
                              <span className="text-slate-700">{normalizeDate(term.endDate)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <label className="inline-flex items-center gap-2 text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={editingValues.isActive}
                                  onChange={(event) =>
                                    setEditingValues((current) =>
                                      current ? { ...current, isActive: event.target.checked } : current,
                                    )
                                  }
                                />
                                Active
                              </label>
                            ) : (
                              <span className="text-slate-700">{term.isActive ? "Yes" : "No"}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => void saveEdit()}
                                  className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 font-medium text-white transition hover:bg-slate-800"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTermId(null);
                                    setEditingValues(null);
                                  }}
                                  className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEditing(term)}
                                className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {terms.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={5}>
                          No terms found for this academic year.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
