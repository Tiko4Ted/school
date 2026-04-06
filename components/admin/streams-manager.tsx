"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PrimaryButton } from "@/components/ui/button";
import { z } from "zod";

type Stream = {
  id: string;
  name: string;
  isDefault: boolean;
};

type Props = {
  classId: string;
  className: string;
};

const streamFormSchema = z.object({
  name: z.string().trim().min(1, "Stream name is required."),
  isDefault: z.boolean(),
});

export function StreamsManager({ classId, className }: Props) {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    void loadStreams();
  }, [classId]);

  async function loadStreams() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/setup/streams?classId=${classId}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { data?: Stream[]; error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Failed to load streams.");
        return;
      }

      setStreams(payload?.data ?? []);
    } catch (err) {
      setError("An unexpected error occurred while loading streams.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateStream(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFieldError(null);
    setError(null);

    const parsed = streamFormSchema.safeParse({ name: newName, isDefault });

    if (!parsed.success) {
      setFieldError(parsed.error.flatten().fieldErrors.name?.[0] ?? "Invalid stream name.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/setup/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          name: parsed.data.name,
          isDefault: parsed.data.isDefault,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Failed to create stream.");
        setIsSubmitting(false);
        return;
      }

      setNewName("");
      setIsDefault(false);
      await loadStreams();
    } catch (err) {
      setError("An unexpected error occurred while creating the stream.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stream Management</CardTitle>
          <CardDescription>
            Create and manage streams for the {className} class.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleCreateStream} className="grid gap-4 sm:grid-cols-12 items-end">
            <div className="sm:col-span-6">
              <FormField label="Stream Name" id="stream-name" error={fieldError}>
                <Input
                  id="stream-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. A, North, Blue"
                />
              </FormField>
            </div>
            <div className="sm:col-span-3 flex items-center h-10 pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-text-secondary">Default Stream</span>
              </label>
            </div>
            <div className="sm:col-span-3">
              <PrimaryButton type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Creating..." : "Add Stream"}
              </PrimaryButton>
            </div>
          </form>

          {error && (
            <div className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm font-medium text-error">
              {error}
            </div>
          )}

          <div className="pt-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-text-secondary/60 mb-4">Existing Streams</h4>
            {isLoading ? (
              <p className="text-sm text-text-secondary italic">Loading streams...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stream Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {streams.map((stream) => (
                    <TableRow key={stream.id}>
                      <TableCell className="font-semibold text-text-primary">{stream.name}</TableCell>
                      <TableCell>
                        {stream.isDefault ? (
                          <span className="inline-flex items-center rounded-lg bg-primary-light px-2.5 py-1 text-xs font-bold text-primary">
                            Default
                          </span>
                        ) : (
                          <span className="text-xs text-text-secondary">Regular</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {streams.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="py-8 text-center text-text-secondary italic">
                        No streams created for this class yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
