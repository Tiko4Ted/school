import { ComponentProps, forwardRef } from "react";

export const Table = forwardRef<HTMLTableElement, ComponentProps<"table">>(
  ({ className = "", ...props }, ref) => (
    <div className="w-full overflow-x-auto rounded-xl border border-border-subtle dark:border-border-dark">
      <table ref={ref} className={`min-w-full divide-y divide-border-subtle text-sm dark:divide-border-dark ${className}`.trim()} {...props} />
    </div>
  )
);
Table.displayName = "Table";

export const TableHeader = forwardRef<HTMLTableSectionElement, ComponentProps<"thead">>(
  ({ className = "", ...props }, ref) => (
    <thead ref={ref} className={`bg-background/50 dark:bg-background-dark/50 ${className}`.trim()} {...props} />
  )
);
TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<HTMLTableSectionElement, ComponentProps<"tbody">>(
  ({ className = "", ...props }, ref) => (
    <tbody ref={ref} className={`divide-y divide-border-subtle bg-white dark:divide-border-dark dark:bg-card-dark ${className}`.trim()} {...props} />
  )
);
TableBody.displayName = "TableBody";

export const TableRow = forwardRef<HTMLTableRowElement, ComponentProps<"tr">>(
  ({ className = "", ...props }, ref) => (
    <tr ref={ref} className={`transition-colors hover:bg-primary-light/20 dark:hover:bg-primary-light/5 ${className}`.trim()} {...props} />
  )
);
TableRow.displayName = "TableRow";

export const TableHead = forwardRef<HTMLTableCellElement, ComponentProps<"th">>(
  ({ className = "", ...props }, ref) => (
    <th ref={ref} className={`px-6 py-4 text-left font-semibold text-text-primary dark:text-text-primary-dark ${className}`.trim()} {...props} />
  )
);
TableHead.displayName = "TableHead";

export const TableCell = forwardRef<HTMLTableCellElement, ComponentProps<"td">>(
  ({ className = "", ...props }, ref) => (
    <td ref={ref} className={`px-6 py-4 align-top text-text-secondary dark:text-text-secondary-dark ${className}`.trim()} {...props} />
  )
);
TableCell.displayName = "TableCell";
