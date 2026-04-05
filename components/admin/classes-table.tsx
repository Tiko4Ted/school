"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SchoolClass = {
  id: string;
  name: string;
  level: number;
  hasStreams: boolean;
  nextClass: { name: string } | null;
};

export function ClassesTable() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClasses() {
      const response = await fetch("/api/setup/classes", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { data?: SchoolClass[]; error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Failed to load classes.");
        setIsLoading(false);
        return;
      }

      setClasses(payload?.data ?? []);
      setIsLoading(false);
    }

    void loadClasses();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>Classes</CardTitle>
            <CardDescription>
              Manage class names, levels, stream behavior, and progression links.
            </CardDescription>
          </div>
          <ButtonLink href="/admin/classes/new" variant="primary">
            Create Class
          </ButtonLink>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-text-secondary">Loading classes...</p> : null}
          {error ? <p className="text-sm text-error">{error}</p> : null}
          {!isLoading && !error ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Streams</TableHead>
                  <TableHead>Next Class</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((schoolClass) => (
                  <TableRow key={schoolClass.id}>
                    <TableCell className="font-medium text-text-primary">{schoolClass.name}</TableCell>
                    <TableCell>{schoolClass.level}</TableCell>
                    <TableCell>{schoolClass.hasStreams ? "Enabled" : "Disabled"}</TableCell>
                    <TableCell>{schoolClass.nextClass?.name ?? "None"}</TableCell>
                    <TableCell>
                      <ButtonLink
                        href={`/admin/classes/${schoolClass.id}`}
                        variant="outline"
                      >
                        Edit
                      </ButtonLink>
                    </TableCell>
                  </TableRow>
                ))}
                {classes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No classes found.
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
