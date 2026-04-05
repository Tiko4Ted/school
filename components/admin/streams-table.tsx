"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Stream = {
  id: string;
  name: string;
  isDefault: boolean;
};

type Props = {
  classId: string;
  className: string;
};

export function StreamsTable({ classId, className }: Props) {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStreams() {
      const response = await fetch(`/api/setup/streams?classId=${classId}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { data?: Stream[]; error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Failed to load streams.");
        setIsLoading(false);
        return;
      }

      setStreams(payload?.data ?? []);
      setIsLoading(false);
    }

    void loadStreams();
  }, [classId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>{className} Streams</CardTitle>
            <CardDescription>
              Manage streams for this class and control the default stream.
            </CardDescription>
          </div>
          <ButtonLink href={`/admin/classes/${classId}/streams/new`} variant="primary">
            Add Stream
          </ButtonLink>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-text-secondary">Loading streams...</p> : null}
          {error ? <p className="text-sm text-error">{error}</p> : null}
          {!isLoading && !error ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {streams.map((stream) => (
                  <TableRow key={stream.id}>
                    <TableCell className="font-medium text-text-primary">{stream.name}</TableCell>
                    <TableCell>{stream.isDefault ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <ButtonLink
                        href={`/admin/classes/${classId}/streams/${stream.id}`}
                        variant="outline"
                      >
                        Edit
                      </ButtonLink>
                    </TableCell>
                  </TableRow>
                ))}
                {streams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No streams found for this class.
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
