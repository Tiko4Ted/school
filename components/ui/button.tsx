import Link from "next/link";
import { ComponentProps, ReactNode, forwardRef } from "react";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "default" | "outline" | "primary" | "secondary";
  className?: string;
};

export function ButtonLink({ href, children, variant = "default", className = "" }: ButtonLinkProps) {
  let variantClassName = "bg-text-primary text-white hover:opacity-90 shadow-soft";
  if (variant === "outline") {
    variantClassName = "border border-border-subtle bg-white text-text-secondary hover:bg-primary-light shadow-soft";
  } else if (variant === "primary") {
    variantClassName = "bg-primary text-white hover:bg-primary-dark shadow-soft";
  } else if (variant === "secondary") {
    variantClassName = "bg-secondary text-white hover:opacity-90 shadow-soft";
  }

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${variantClassName} ${className}`.trim()}
    >
      {children}
    </Link>
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: "default" | "outline" | "primary" | "secondary" | "ghost";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    let variantClassName = "bg-text-primary text-white hover:opacity-90 shadow-soft";
    if (variant === "outline") {
      variantClassName = "border border-border-subtle bg-white text-text-secondary hover:bg-primary-light shadow-soft";
    } else if (variant === "primary") {
      variantClassName = "bg-primary text-white hover:bg-primary-dark shadow-soft";
    } else if (variant === "secondary") {
      variantClassName = "bg-secondary text-white hover:opacity-90 shadow-soft";
    } else if (variant === "ghost") {
      variantClassName = "text-primary hover:bg-primary-light bg-transparent";
    }

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClassName} ${className}`.trim()}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export const PrimaryButton = forwardRef<HTMLButtonElement, ComponentProps<"button">>(
  (props, ref) => <Button ref={ref} variant="primary" {...props} />
);
PrimaryButton.displayName = "PrimaryButton";
