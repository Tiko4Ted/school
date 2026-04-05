"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  level: z.coerce.number().int().positive("Level must be a positive number."),
  hasStreams: z.boolean(),
  nextClassId: z.string().uuid().nullable(),
});

type ClassOption = {
  id: string;
  name: string;
  level: number;
};

type InitialValues = {
  name: string;
  level: number;
  hasStreams: boolean;
  nextClassId: string | null;
};

type Props = {
  mode: "create" | "edit";
  title: string;
  description: string;
  submitLabel: string;
  initialValues: InitialValues;
  classId?: string;
  classOptions: ClassOption[];
};

export function ClassForm({
  mode,
  title,
  description,
  submitLabel,
  initialValues,
  classId,
  classOptions,
}: Props) {
  const router = useRouter();
  const [values, setValues] = useState({
    name: initialValues.name,
    level: String(initialValues.level),
    hasStreams: initialValues.hasStreams,
    nextClassId: initialValues.nextClassId ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableNextClasses = useMemo(
    () => classOptions.filter((option) => option.id !== classId),
    [classId, classOptions],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setErrors({});

    const parsed = formSchema.safeParse({
      name: values.name,
      level: values.level,
      hasStreams: values.hasStreams,
      nextClassId: values.nextClassId ? values.nextClassId : null,
    });

    if (!parsed.success) {
      const nextErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        name: nextErrors.name?.[0] ?? "",
        level: nextErrors.level?.[0] ?? "",
        nextClassId: nextErrors.nextClassId?.[0] ?? "",
      });
      setIsSubmitting(false);
      return;
    }

    const endpoint = mode === "create" ? "/api/setup/classes" : `/api/setup/classes/${classId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setFormError(payload?.error ?? "Failed to save class.");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/classes");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-3xl">
        <Card className="border-slate-200 bg-white/95">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Classes</p>
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="level">
                  Level
                </label>
                <input
                  id="level"
                  type="number"
                  min={1}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                  value={values.level}
                  onChange={(event) => setValues((current) => ({ ...current, level: event.target.value }))}
                />
                {errors.level ? <p className="text-sm text-rose-600">{errors.level}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="nextClassId">
                  Next class
                </label>
                <select
                  id="nextClassId"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                  value={values.nextClassId}
                  onChange={(event) => setValues((current) => ({ ...current, nextClassId: event.target.value }))}
                >
                  <option value="">None</option>
                  {availableNextClasses.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} (Level {option.level})
                    </option>
                  ))}
                </select>
                {errors.nextClassId ? <p className="text-sm text-rose-600">{errors.nextClassId}</p> : null}
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={values.hasStreams}
                  onChange={(event) => setValues((current) => ({ ...current, hasStreams: event.target.checked }))}
                />
                <span className="text-sm text-slate-700">This class uses streams</span>
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
                  href="/admin/classes"
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
