"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Stream = {
  id: string;
  name: string;
  isDefault: boolean;
};

type Props = {
  classId: string;
  className: string;
};

export function StreamsTable({ classId, className }: Props) {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStreams() {
      const response = await fetch(`/api/setup/streams?classId=${classId}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { data?: Stream[]; error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Failed to load streams.");
        setIsLoading(false);
        return;
      }

      setStreams(payload?.data ?? []);
      setIsLoading(false);
    }

    void loadStreams();
  }, [classId]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-5xl">
        <Card className="border-slate-200 bg-white/95">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Streams</p>
              <CardTitle className="text-3xl">{className}</CardTitle>
              <CardDescription className="text-base">
                Manage streams for this class and control the default stream.
              </CardDescription>
            </div>
            <ButtonLink href={`/admin/classes/${classId}/streams/new`}>Add Stream</ButtonLink>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-sm text-slate-600">Loading streams...</p> : null}
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {!isLoading && !error ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Default</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {streams.map((stream) => (
                      <tr key={stream.id}>
                        <td className="px-4 py-3 text-slate-900">{stream.name}</td>
                        <td className="px-4 py-3 text-slate-700">{stream.isDefault ? "Yes" : "No"}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/classes/${classId}/streams/${stream.id}`}
                            className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {streams.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={3}>
                          No streams found for this class.
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
