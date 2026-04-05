"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

type SchoolClass = {
  id: string;
  name: string;
  level: number;
  hasStreams: boolean;
  nextClass: { name: string } | null;
};

export function ClassesTable() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClasses() {
      const response = await fetch("/api/setup/classes", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { data?: SchoolClass[]; error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Failed to load classes.");
        setIsLoading(false);
        return;
      }

      setClasses(payload?.data ?? []);
      setIsLoading(false);
    }

    void loadClasses();
  }, []);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-6xl">
        <Card className="border-slate-200 bg-white/95">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Admin Classes</p>
              <CardTitle className="text-3xl">Classes</CardTitle>
              <CardDescription className="text-base">
                Manage class names, levels, stream behavior, and progression links.
              </CardDescription>
            </div>
            <ButtonLink href="/admin/classes/new">Create Class</ButtonLink>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-sm text-slate-600">Loading classes...</p> : null}
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {!isLoading && !error ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Level</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Streams</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Next Class</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {classes.map((schoolClass) => (
                      <tr key={schoolClass.id}>
                        <td className="px-4 py-3 text-slate-900">{schoolClass.name}</td>
                        <td className="px-4 py-3 text-slate-700">{schoolClass.level}</td>
                        <td className="px-4 py-3 text-slate-700">{schoolClass.hasStreams ? "Enabled" : "Disabled"}</td>
                        <td className="px-4 py-3 text-slate-700">{schoolClass.nextClass?.name ?? "None"}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/classes/${schoolClass.id}`}
                            className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {classes.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={5}>
                          No classes found.
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
