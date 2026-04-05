"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";

const generateSchema = z.object({
  examId: z.string().uuid(),
  classId: z.string().uuid(),
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

async function postMeritList(path: string, body: unknown) {
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
    return { success: false as const, error: payload?.error ?? "Failed to process merit list request." };
  }

  return { success: true as const };
}

export async function generateMeritListAction(formData: z.infer<typeof generateSchema>) {
  const parsed = generateSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().formErrors[0] ?? "Invalid payload." };
  }

  return postMeritList("/api/merit-lists", {
    examId: parsed.data.examId,
    classId: parsed.data.classId,
  });
}
