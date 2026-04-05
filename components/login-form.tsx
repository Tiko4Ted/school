"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PrimaryButton } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    setIsLoading(false);

    if (!result || result.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(result.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">SchoolMS</p>
        <CardTitle className="text-3xl font-extrabold tracking-tight">Welcome Back</CardTitle>
        <CardDescription className="text-base">
          Sign in to access your dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormField label="Email" id="email">
            <Input
              required
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="admin@schoolms.local"
            />
          </FormField>

          <FormField label="Password" id="password">
            <Input
              required
              id="password"
              type="password"
              name="password"
              minLength={8}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </FormField>

          {error ? (
            <div className="rounded-xl border border-error/20 bg-error/10 p-4 text-center text-sm font-medium text-error">
              {error}
            </div>
          ) : null}

          <PrimaryButton type="submit" disabled={isLoading} className="w-full py-3.5">
            {isLoading ? "Signing in..." : "Sign in"}
          </PrimaryButton>
        </form>
      </CardContent>
    </Card>
  );
}
