"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button, PrimaryButton } from "@/components/ui/button";

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <FormField label="Name" id="name" error={errors.name}>
              <Input
                id="name"
                value={values.name}
                onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. 2024/2025 Academic Year"
              />
            </FormField>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField label="Start Date" id="startDate" error={errors.startDate}>
                <Input
                  id="startDate"
                  type="date"
                  value={values.startDate}
                  onChange={(event) => setValues((current) => ({ ...current, startDate: event.target.value }))}
                />
              </FormField>

              <FormField label="End Date" id="endDate" error={errors.endDate}>
                <Input
                  id="endDate"
                  type="date"
                  value={values.endDate}
                  onChange={(event) => setValues((current) => ({ ...current, endDate: event.target.value }))}
                />
              </FormField>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-background/50 p-4 dark:border-border-dark dark:bg-background-dark/50">
              <input
                id="isActive"
                type="checkbox"
                className="h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary dark:border-border-dark"
                checked={values.isActive}
                onChange={(event) => setValues((current) => ({ ...current, isActive: event.target.checked }))}
              />
              <label htmlFor="isActive" className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
                Set as active academic year
              </label>
            </div>

            {formError ? (
              <div className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm font-medium text-error">
                {formError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <PrimaryButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : submitLabel}
              </PrimaryButton>
              <Button type="button" variant="outline" onClick={() => router.push("/admin/academicyears")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
