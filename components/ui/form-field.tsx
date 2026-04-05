import { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  id?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
};

export function FormField({ label, id, error, children, className = "" }: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()}>
      <label 
        className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark" 
        htmlFor={id}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-error">{error}</p>
      ) : null}
    </div>
  );
}
