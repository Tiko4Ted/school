"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  name: z.string().trim().min(2, "Subject name is required."),
  code: z.string().trim().min(2, "Subject code is required.").max(20, "Code is too long."),
});

type Props = {
  mode: "create" | "edit";
  subjectId?: string;
  title: string;
  description: string;
  submitLabel: string;
  initialValues: {
    name: string;
    code: string;
  };
};

export function SubjectForm({ mode, subjectId, title, description, submitLabel, initialValues }: Props) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const parsed = formSchema.safeParse(values);

    if (!parsed.success) {
      const nextErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        name: nextErrors.name?.[0] ?? "",
        code: nextErrors.code?.[0] ?? "",
      });
      setIsSubmitting(false);
      return;
    }

    const endpoint = mode === "create" ? "/api/setup/subjects" : `/api/setup/subjects/${subjectId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setFormError(payload?.error ?? "Failed to save subject.");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/subjects");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-3xl">
        <Card className="border-slate-200 bg-white/95">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Subjects</p>
            <CardTitle className="text-3xl">{title}</CardTitle>
            <CardDescription className="text-base">{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="name">
                  Subject name
                </label>
                <input
                  id="name"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                  value={values.name}
                  onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                />
                {errors.name ? <p className="text-sm text-rose-600">{errors.name}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="code">
                  Subject code
                </label>
                <input
                  id="code"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 uppercase outline-none transition focus:border-sky-500"
                  value={values.code}
                  onChange={(event) => setValues((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                />
                {errors.code ? <p className="text-sm text-rose-600">{errors.code}</p> : null}
              </div>

              {formError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {formError}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Saving..." : submitLabel}
                </button>
                <Link
                  href="/admin/subjects"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
