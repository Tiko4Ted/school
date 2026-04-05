"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  terms: Array<{ id: string }>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export function AcademicYearsTable() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAcademicYears() {
      const response = await fetch("/api/setup/academicyears", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { data?: AcademicYear[]; error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Failed to load academic years.");
        setIsLoading(false);
        return;
      }

      setAcademicYears(payload?.data ?? []);
      setIsLoading(false);
    }

    void loadAcademicYears();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>Academic Years</CardTitle>
            <CardDescription>
              Manage academic years and drill into term setup for each one.
            </CardDescription>
          </div>
          <ButtonLink href="/admin/academicyears/new" variant="primary">
            Create Academic Year
          </ButtonLink>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-text-secondary">Loading academic years...</p> : null}
          {error ? <p className="text-sm text-error">{error}</p> : null}
          {!isLoading && !error ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Terms</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {academicYears.map((year) => (
                  <TableRow key={year.id}>
                    <TableCell className="font-medium text-text-primary">{year.name}</TableCell>
                    <TableCell>{formatDate(year.startDate)}</TableCell>
                    <TableCell>{formatDate(year.endDate)}</TableCell>
                    <TableCell>{year.isActive ? "Yes" : "No"}</TableCell>
                    <TableCell>{year.terms.length}</TableCell>
                    <TableCell>
                      <ButtonLink
                        href={`/admin/academicyears/${year.id}/terms`}
                        variant="outline"
                      >
                        Manage Terms
                      </ButtonLink>
                    </TableCell>
                  </TableRow>
                ))}
                {academicYears.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No academic years found.
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
