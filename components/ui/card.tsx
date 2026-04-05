import { HTMLAttributes } from "react";

type DivProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: DivProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-border-subtle bg-card shadow-soft dark:border-border-dark dark:bg-card-dark ${className}`.trim()}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }: DivProps) {
  return <div className={`border-b border-border-subtle bg-background/50 p-6 dark:border-border-dark dark:bg-background-dark/50 ${className}`.trim()} {...props} />;
}

export function CardTitle({ className = "", ...props }: DivProps) {
  return <div className={`text-lg font-semibold tracking-tight text-text-primary dark:text-text-primary-dark ${className}`.trim()} {...props} />;
}

export function CardDescription({ className = "", ...props }: DivProps) {
  return <div className={`text-sm text-text-secondary dark:text-text-secondary-dark ${className}`.trim()} {...props} />;
}

export function CardContent({ className = "", ...props }: DivProps) {
  return <div className={`p-6 md:p-8 ${className}`.trim()} {...props} />;
}
