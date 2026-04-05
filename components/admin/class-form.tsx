"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button, PrimaryButton } from "@/components/ui/button";

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
                placeholder="e.g. Primary 1"
              />
            </FormField>

            <FormField label="Level" id="level" error={errors.level}>
              <Input
                id="level"
                type="number"
                min={1}
                value={values.level}
                onChange={(event) => setValues((current) => ({ ...current, level: event.target.value }))}
              />
            </FormField>

            <FormField label="Next Class" id="nextClassId" error={errors.nextClassId}>
              <Select
                id="nextClassId"
                value={values.nextClassId}
                onChange={(event) => setValues((current) => ({ ...current, nextClassId: event.target.value }))}
              >
                <option value="">None</option>
                {availableNextClasses.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} (Level {option.level})
                  </option>
                ))}
              </Select>
            </FormField>

            <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-background/50 p-4 dark:border-border-dark dark:bg-background-dark/50">
              <input
                id="hasStreams"
                type="checkbox"
                className="h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary dark:border-border-dark"
                checked={values.hasStreams}
                onChange={(event) => setValues((current) => ({ ...current, hasStreams: event.target.checked }))}
              />
              <label htmlFor="hasStreams" className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
                This class uses streams
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
              <Button type="button" variant="outline" onClick={() => router.push("/admin/classes")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
