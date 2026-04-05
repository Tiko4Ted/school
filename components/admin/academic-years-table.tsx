"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  terms: Array<{ id: string }>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export function AcademicYearsTable() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAcademicYears() {
      const response = await fetch("/api/setup/academicyears", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { data?: AcademicYear[]; error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Failed to load academic years.");
        setIsLoading(false);
        return;
      }

      setAcademicYears(payload?.data ?? []);
      setIsLoading(false);
    }

    void loadAcademicYears();
  }, []);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-6xl">
        <Card className="border-slate-200 bg-white/95">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Academic Years</p>
              <CardTitle className="text-3xl">Academic Years</CardTitle>
              <CardDescription className="text-base">
                Manage academic years and drill into term setup for each one.
              </CardDescription>
            </div>
            <ButtonLink href="/admin/academicyears/new">Create Academic Year</ButtonLink>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-sm text-slate-600">Loading academic years...</p> : null}
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {!isLoading && !error ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Start</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">End</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Active</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Terms</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {academicYears.map((year) => (
                      <tr key={year.id}>
                        <td className="px-4 py-3 text-slate-900">{year.name}</td>
                        <td className="px-4 py-3 text-slate-700">{formatDate(year.startDate)}</td>
                        <td className="px-4 py-3 text-slate-700">{formatDate(year.endDate)}</td>
                        <td className="px-4 py-3 text-slate-700">{year.isActive ? "Yes" : "No"}</td>
                        <td className="px-4 py-3 text-slate-700">{year.terms.length}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/academicyears/${year.id}/terms`}
                            className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
                          >
                            Manage Terms
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {academicYears.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={6}>
                          No academic years found.
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
