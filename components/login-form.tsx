"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

const wrapperStyle = {
  width: "100%",
  maxWidth: "420px",
  background: "#ffffff",
  borderRadius: "18px",
  padding: "32px",
  boxShadow: "0 22px 60px rgba(21, 32, 51, 0.12)",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #cbd4e1",
  marginTop: "8px",
};

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
    <form onSubmit={handleSubmit} style={wrapperStyle}>
      <p style={{ margin: 0, color: "#5b6b87", fontSize: "13px" }}>SchoolMS</p>
      <h1 style={{ margin: "12px 0 8px", fontSize: "30px" }}>Sign in</h1>
      <p style={{ margin: "0 0 24px", color: "#4f5f79", lineHeight: 1.5 }}>
        Use your admin or teacher credentials to access the system.
      </p>

      <label style={{ display: "block", marginBottom: "16px" }}>
        <span>Email</span>
        <input
          required
          type="email"
          name="email"
          autoComplete="email"
          style={inputStyle}
          placeholder="admin@schoolms.local"
        />
      </label>

      <label style={{ display: "block", marginBottom: "16px" }}>
        <span>Password</span>
        <input
          required
          type="password"
          name="password"
          minLength={8}
          autoComplete="current-password"
          style={inputStyle}
          placeholder="Enter your password"
        />
      </label>

      {error ? (
        <p
          style={{
            margin: "0 0 16px",
            padding: "12px 14px",
            borderRadius: "10px",
            background: "#fef2f2",
            color: "#b42318",
          }}
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: "10px",
          border: "none",
          background: "#152033",
          color: "#ffffff",
          cursor: isLoading ? "wait" : "pointer",
        }}
      >
        {isLoading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
