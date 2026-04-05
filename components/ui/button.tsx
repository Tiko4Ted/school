import Link from "next/link";
import { ReactNode } from "react";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "default" | "outline";
};

export function ButtonLink({ href, children, variant = "default" }: ButtonLinkProps) {
  const variantClassName =
    variant === "outline"
      ? "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
      : "bg-slate-900 text-white hover:bg-slate-800";

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${variantClassName}`}
    >
      {children}
    </Link>
  );
}
