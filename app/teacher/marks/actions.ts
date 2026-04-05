"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";

const singleMarkSchema = z.object({
  examId: z.string().uuid(),
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  score: z.number().min(0).max(100),
});

const bulkMarksSchema = z.object({
  examId: z.string().uuid(),
  streamId: z.string().uuid(),
  subjectId: z.string().uuid(),
  rows: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        score: z.number().min(0).max(100),
      }),
    )
    .min(1),
});

function resolveBaseUrl() {
  const headerStore = headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = headerStore.get("host");

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }

  if (host) {
    return `http://${host}`;
  }

  return "http://localhost:3000";
}

function buildCookieHeader() {
  const store = cookies();
  const all = store.getAll();
  return all.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

async function callMarksApi(path: string, body: unknown) {
  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: buildCookieHeader(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as { error?: string; data?: unknown } | null;

  if (!response.ok) {
    return { success: false as const, error: payload?.error ?? "Failed to process marks." };
  }

  return { success: true as const, data: payload?.data };
}

export async function submitSingleMark(formData: z.infer<typeof singleMarkSchema>) {
  const parsed = singleMarkSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().formErrors[0] ?? "Invalid mark data." };
  }

  return callMarksApi("/api/marks", parsed.data);
}

export async function submitBulkMarks(formData: z.infer<typeof bulkMarksSchema>) {
  const parsed = bulkMarksSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().formErrors[0] ?? "Invalid bulk data." };
  }

  return callMarksApi(`/api/marks?action=bulk`, parsed.data);
}
