"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z
  .object({
    name: z.string().trim().min(4, "Academic year name is required."),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
    isActive: z.boolean(),
  })
  .refine((value) => new Date(value.endDate) > new Date(value.startDate), {
    path: ["endDate"],
    message: "End date must be after start date.",
  });

type Props = {
  title: string;
  description: string;
  submitLabel: string;
  initialValues: {
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
};

export function AcademicYearForm({ title, description, submitLabel, initialValues }: Props) {
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
        startDate: nextErrors.startDate?.[0] ?? "",
        endDate: nextErrors.endDate?.[0] ?? "",
      });
      setIsSubmitting(false);
      return;
    }

    const response = await fetch("/api/setup/academicyears", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setFormError(payload?.error ?? "Failed to save academic year.");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/academicyears");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-3xl">
        <Card className="border-slate-200 bg-white/95">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Academic Years</p>
            <CardTitle className="text-3xl">{title}</CardTitle>
            <CardDescription className="text-base">{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                  value={values.name}
                  onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                />
                {errors.name ? <p className="text-sm text-rose-600">{errors.name}</p> : null}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="startDate">
                    Start date
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                    value={values.startDate}
                    onChange={(event) => setValues((current) => ({ ...current, startDate: event.target.value }))}
                  />
                  {errors.startDate ? <p className="text-sm text-rose-600">{errors.startDate}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="endDate">
                    End date
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                    value={values.endDate}
                    onChange={(event) => setValues((current) => ({ ...current, endDate: event.target.value }))}
                  />
                  {errors.endDate ? <p className="text-sm text-rose-600">{errors.endDate}</p> : null}
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={values.isActive}
                  onChange={(event) => setValues((current) => ({ ...current, isActive: event.target.checked }))}
                />
                <span className="text-sm text-slate-700">Set as active academic year</span>
              </label>

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
                  href="/admin/academicyears"
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
