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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <FormField label="Subject Name" id="name" error={errors.name}>
              <Input
                id="name"
                value={values.name}
                onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Mathematics"
              />
            </FormField>

            <FormField label="Subject Code" id="code" error={errors.code}>
              <Input
                id="code"
                className="uppercase"
                value={values.code}
                onChange={(event) => setValues((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                placeholder="e.g. MATH"
              />
            </FormField>

            {formError ? (
              <div className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm font-medium text-error">
                {formError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <PrimaryButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : submitLabel}
              </PrimaryButton>
              <Button type="button" variant="outline" onClick={() => router.push("/admin/subjects")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
