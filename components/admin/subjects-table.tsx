"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Subject = {
  id: string;
  name: string;
  code: string;
};

export function SubjectsTable() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSubjects() {
      const response = await fetch("/api/setup/subjects", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { data?: Subject[]; error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Failed to load subjects.");
        setIsLoading(false);
        return;
      }

      setSubjects(payload?.data ?? []);
      setIsLoading(false);
    }

    void loadSubjects();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>Subjects</CardTitle>
            <CardDescription>
              Manage school-wide subjects and their codes.
            </CardDescription>
          </div>
          <ButtonLink href="/admin/subjects/new" variant="primary">
            Create Subject
          </ButtonLink>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-text-secondary">Loading subjects...</p> : null}
          {error ? <p className="text-sm text-error">{error}</p> : null}
          {!isLoading && !error ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium text-text-primary">{subject.name}</TableCell>
                    <TableCell className="font-mono">{subject.code}</TableCell>
                    <TableCell>
                      <ButtonLink
                        href={`/admin/subjects/${subject.id}`}
                        variant="outline"
                      >
                        Edit
                      </ButtonLink>
                    </TableCell>
                  </TableRow>
                ))}
                {subjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No subjects found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
