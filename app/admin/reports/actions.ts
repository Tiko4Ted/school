"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";

const publishSchema = z.object({
  termId: z.string().uuid(),
  classId: z.string().uuid(),
  examIds: z.array(z.string().uuid()).min(1).max(3),
});

const reopenSchema = z.object({
  reportId: z.string().uuid(),
});

const remarkSchema = z.object({
  reportId: z.string().uuid(),
  studentId: z.string().uuid(),
  remark: z.string().trim().min(3),
  classTeacherName: z.string().trim().min(2).optional(),
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
  return store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

async function postReports(path: string, body: unknown) {
  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: buildCookieHeader(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    return { success: false as const, error: payload?.error ?? "Report action failed." };
  }

  return { success: true as const };
}

export async function publishReportAction(formData: z.infer<typeof publishSchema>) {
  const parsed = publishSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().formErrors[0] ?? "Invalid publish payload." };
  }

  return postReports("/api/reports", parsed.data);
}

export async function reopenReportAction(formData: z.infer<typeof reopenSchema>) {
  const parsed = reopenSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().formErrors[0] ?? "Invalid report id." };
  }

  return postReports("/api/reports?action=reopen", { reportId: parsed.data.reportId });
}

export async function updateRemarkAction(formData: z.infer<typeof remarkSchema>) {
  const parsed = remarkSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().formErrors[0] ?? "Invalid remark payload." };
  }

  return postReports("/api/reports?action=remark", parsed.data);
}
