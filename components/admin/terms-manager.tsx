"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

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
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <CardTitle>{academicYearName}</CardTitle>
            <CardDescription>
              Create and edit terms for this academic year.
            </CardDescription>
          </div>
          <ButtonLink href="/admin/academicyears" variant="outline">Back to Academic Years</ButtonLink>
        </CardHeader>
        <CardContent className="space-y-8">
          <form className="grid gap-4 rounded-2xl border border-border-subtle bg-background/50 p-6 dark:border-border-dark dark:bg-background-dark/50 md:grid-cols-5" onSubmit={handleCreateTerm}>
            <Input
              placeholder="Term name"
              value={newTerm.name}
              onChange={(event) => setNewTerm((current) => ({ ...current, name: event.target.value }))}
            />
            <Input
              type="date"
              value={newTerm.startDate}
              onChange={(event) => setNewTerm((current) => ({ ...current, startDate: event.target.value }))}
            />
            <Input
              type="date"
              value={newTerm.endDate}
              onChange={(event) => setNewTerm((current) => ({ ...current, endDate: event.target.value }))}
            />
            <label className="flex items-center gap-3 rounded-xl border border-border-subtle bg-white px-4 py-2.5 text-sm font-medium text-text-secondary dark:border-border-dark dark:bg-card-dark">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary dark:border-border-dark"
                checked={newTerm.isActive}
                onChange={(event) => setNewTerm((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Active
            </label>
            <Button
              type="submit"
              disabled={isCreating}
              className="bg-primary text-white hover:bg-primary-dark"
            >
              {isCreating ? "Creating..." : "Create Term"}
            </Button>
          </form>

          {error ? (
            <div className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm font-medium text-error">
              {error}
            </div>
          ) : null}

          {isLoading ? <p className="text-sm text-text-secondary">Loading terms...</p> : null}

          {!isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.map((term) => {
                  const isEditing = editingTermId === term.id && editingValues;

                  return (
                    <TableRow key={term.id}>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            className="py-1.5"
                            value={editingValues.name}
                            onChange={(event) =>
                              setEditingValues((current) => (current ? { ...current, name: event.target.value } : current))
                            }
                          />
                        ) : (
                          <span className="font-semibold text-text-primary dark:text-text-primary-dark">{term.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="date"
                            className="py-1.5"
                            value={editingValues.startDate}
                            onChange={(event) =>
                              setEditingValues((current) =>
                                current ? { ...current, startDate: event.target.value } : current,
                              )
                            }
                          />
                        ) : (
                          <span className="text-text-secondary dark:text-text-secondary-dark">{normalizeDate(term.startDate)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="date"
                            className="py-1.5"
                            value={editingValues.endDate}
                            onChange={(event) =>
                              setEditingValues((current) => (current ? { ...current, endDate: event.target.value } : current))
                            }
                          />
                        ) : (
                          <span className="text-text-secondary dark:text-text-secondary-dark">{normalizeDate(term.endDate)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <label className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary dark:border-border-dark"
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
                          <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold uppercase ${term.isActive ? "bg-secondary-light text-secondary" : "bg-background text-text-secondary"}`}>
                            {term.isActive ? "Active" : "Inactive"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              onClick={() => void saveEdit()}
                              className="h-9 bg-primary text-white"
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setEditingTermId(null);
                                setEditingValues(null);
                              }}
                              className="h-9"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => startEditing(term)}
                            className="h-9"
                          >
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {terms.length === 0 ? (
                  <TableRow>
                    <TableCell className="py-10 text-center text-text-secondary" colSpan={5}>
                      No terms found for this academic year.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
