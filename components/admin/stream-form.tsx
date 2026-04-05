"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button, PrimaryButton } from "@/components/ui/button";

const formSchema = z.object({
  name: z.string().trim().min(1, "Stream name is required."),
  isDefault: z.boolean(),
});

type Props = {
  mode: "create" | "edit";
  classId: string;
  streamId?: string;
  className: string;
  title: string;
  description: string;
  submitLabel: string;
  initialValues: {
    name: string;
    isDefault: boolean;
  };
};

export function StreamForm({
  mode,
  classId,
  streamId,
  className,
  title,
  description,
  submitLabel,
  initialValues,
}: Props) {
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
      });
      setIsSubmitting(false);
      return;
    }

    const endpoint = mode === "create" ? "/api/setup/streams" : `/api/setup/streams/${streamId}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const body = mode === "create" ? { ...parsed.data, classId } : parsed.data;

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setFormError(payload?.error ?? "Failed to save stream.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/admin/classes/${classId}/streams`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description} Class: {className}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <FormField label="Stream Name" id="name" error={errors.name}>
              <Input
                id="name"
                value={values.name}
                onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. A"
              />
            </FormField>

            <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-background/50 p-4 dark:border-border-dark dark:bg-background-dark/50">
              <input
                id="isDefault"
                type="checkbox"
                className="h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary dark:border-border-dark"
                checked={values.isDefault}
                onChange={(event) => setValues((current) => ({ ...current, isDefault: event.target.checked }))}
              />
              <label htmlFor="isDefault" className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
                Set as default stream for this class
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
              <Button type="button" variant="outline" onClick={() => router.push(`/admin/classes/${classId}/streams`)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
