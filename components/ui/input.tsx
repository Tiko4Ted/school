import { ComponentProps, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-xl border border-border-subtle bg-white px-4 py-2.5 text-sm text-text-primary shadow-soft outline-none transition-all placeholder:text-text-secondary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-background disabled:text-text-secondary/60 dark:border-border-dark dark:bg-card-dark dark:text-text-primary-dark ${className}`.trim()}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
