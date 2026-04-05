"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, ButtonLink, PrimaryButton } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Subject = {
  id: string;
  name: string;
  code: string;
};

type ClassSubject = {
  id: string;
  subjectId: string;
  subject: Subject;
};

type Props = {
  classId: string;
  className: string;
  allSubjects: Subject[];
};

export function ClassSubjectsManager({ classId, className, allSubjects }: Props) {
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadClassSubjects() {
    const response = await fetch(`/api/setup/classsubjects?classId=${classId}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { data?: ClassSubject[]; error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Failed to load class subjects.");
      setIsLoading(false);
      return;
    }

    const rows = payload?.data ?? [];
    setClassSubjects(rows);
    setError(null);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadClassSubjects();
  }, [classId]);

  const availableSubjects = useMemo(
    () => allSubjects.filter((subject) => !classSubjects.some((row) => row.subjectId === subject.id)),
    [allSubjects, classSubjects],
  );

  async function handleAddSubject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSubjectId) {
      setError("Select a subject to map.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/setup/classsubjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, subjectId: selectedSubjectId }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Failed to map subject.");
      setIsSubmitting(false);
      return;
    }

    setSelectedSubjectId("");
    setIsSubmitting(false);
    void loadClassSubjects();
  }

  async function handleRemove(classSubjectId: string) {
    const response = await fetch(`/api/setup/classsubjects/${classSubjectId}`, {
      method: "DELETE",
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Failed to remove class subject.");
      return;
    }

    void loadClassSubjects();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <CardTitle>{className} - Subjects</CardTitle>
            <CardDescription>
              Map school-wide subjects to this class.
            </CardDescription>
          </div>
          <ButtonLink href={`/admin/classes/${classId}`} variant="outline">Back to Class</ButtonLink>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="flex flex-col gap-4 md:flex-row md:items-end" onSubmit={handleAddSubject}>
            <FormField label="Subject" className="flex-1">
              <Select
                value={selectedSubjectId}
                onChange={(event) => setSelectedSubjectId(event.target.value)}
              >
                <option value="">Select subject</option>
                {availableSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </Select>
            </FormField>
            <PrimaryButton
              type="submit"
              disabled={isSubmitting || availableSubjects.length === 0}
            >
              {isSubmitting ? "Adding..." : "Add Subject"}
            </PrimaryButton>
          </form>

          {error ? (
            <div className="rounded-xl border border-error/20 bg-error/5 p-4 text-sm text-error">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <p className="py-8 text-center text-sm text-text-secondary">Loading class subjects...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classSubjects.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-text-primary">{row.subject.name}</TableCell>
                    <TableCell>{row.subject.code}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleRemove(row.id)}
                        className="text-error hover:bg-error/5 hover:text-error border-error/20"
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {classSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-12 text-center text-text-secondary">
                      No subjects mapped to this class.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

