"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Subject = {
  id: string;
  name: string;
  code: string;
};

export function SubjectsTable() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSubjects() {
      const response = await fetch("/api/setup/subjects", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { data?: Subject[]; error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Failed to load subjects.");
        setIsLoading(false);
        return;
      }

      setSubjects(payload?.data ?? []);
      setIsLoading(false);
    }

    void loadSubjects();
  }, []);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-5xl">
        <Card className="border-slate-200 bg-white/95">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Subjects</p>
              <CardTitle className="text-3xl">Subjects</CardTitle>
              <CardDescription className="text-base">
                Manage school-wide subjects and their codes.
              </CardDescription>
            </div>
            <ButtonLink href="/admin/subjects/new">Create Subject</ButtonLink>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-sm text-slate-600">Loading subjects...</p> : null}
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {!isLoading && !error ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Code</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {subjects.map((subject) => (
                      <tr key={subject.id}>
                        <td className="px-4 py-3 text-slate-900">{subject.name}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{subject.code}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/subjects/${subject.id}`}
                            className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {subjects.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={3}>
                          No subjects found.
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
