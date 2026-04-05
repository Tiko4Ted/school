import { HTMLAttributes } from "react";

type DivProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: DivProps) {
  return (
    <div
      className={`rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)] ${className}`.trim()}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }: DivProps) {
  return <div className={`space-y-2 p-6 ${className}`.trim()} {...props} />;
}

export function CardTitle({ className = "", ...props }: DivProps) {
  return <div className={`text-xl font-semibold tracking-tight text-slate-900 ${className}`.trim()} {...props} />;
}

export function CardDescription({ className = "", ...props }: DivProps) {
  return <div className={`text-sm leading-6 text-slate-600 ${className}`.trim()} {...props} />;
}

export function CardContent({ className = "", ...props }: DivProps) {
  return <div className={`p-6 pt-0 ${className}`.trim()} {...props} />;
}
