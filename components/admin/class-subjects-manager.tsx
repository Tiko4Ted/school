"use client";

import { useEffect, useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Subject = {
  id: string;
  name: string;
  code: string;
};

type ClassSubject = {
  id: string;
  subjectId: string;
  subject: Subject;
};

type Props = {
  classId: string;
  className: string;
  allSubjects: Subject[];
};

export function ClassSubjectsManager({ classId, className, allSubjects }: Props) {
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadClassSubjects() {
    const response = await fetch(`/api/setup/classsubjects?classId=${classId}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { data?: ClassSubject[]; error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Failed to load class subjects.");
      setIsLoading(false);
      return;
    }

    const rows = payload?.data ?? [];
    setClassSubjects(rows);
    setSelectedSubjectId((current) => {
      if (current && !rows.some((row) => row.subjectId === current)) {
        return current;
      }
      return current;
    });
    setError(null);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadClassSubjects();
  }, [classId]);

  const availableSubjects = useMemo(
    () => allSubjects.filter((subject) => !classSubjects.some((row) => row.subjectId === subject.id)),
    [allSubjects, classSubjects],
  );

  async function handleAddSubject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSubjectId) {
      setError("Select a subject to map.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/setup/classsubjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, subjectId: selectedSubjectId }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Failed to map subject.");
      setIsSubmitting(false);
      return;
    }

    setSelectedSubjectId("");
    setIsSubmitting(false);
    void loadClassSubjects();
  }

  async function handleRemove(classSubjectId: string) {
    const response = await fetch(`/api/setup/classsubjects/${classSubjectId}`, {
      method: "DELETE",
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Failed to remove class subject.");
      return;
    }

    void loadClassSubjects();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-5xl space-y-6">
        <Card className="border-slate-200 bg-white/95">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Class Subjects</p>
              <CardTitle className="text-3xl">{className}</CardTitle>
              <CardDescription className="text-base">
                Map school-wide subjects to this class.
              </CardDescription>
            </div>
            <ButtonLink href={`/admin/classes/${classId}`}>Back to Class</ButtonLink>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleAddSubject}>
              <select
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                value={selectedSubjectId}
                onChange={(event) => setSelectedSubjectId(event.target.value)}
              >
                <option value="">Select subject</option>
                {availableSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isSubmitting || availableSubjects.length === 0}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Adding..." : "Add Subject"}
              </button>
            </form>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {isLoading ? <p className="text-sm text-slate-600">Loading class subjects...</p> : null}

            {!isLoading ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Subject</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Code</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {classSubjects.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 text-slate-900">{row.subject.name}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{row.subject.code}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void handleRemove(row.id)}
                            className="inline-flex items-center rounded-xl border border-rose-300 px-3 py-2 font-medium text-rose-700 transition hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {classSubjects.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={3}>
                          No subjects mapped to this class.
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
