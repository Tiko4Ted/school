import { ReactNode } from "react";
import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/teacher/dashboard" },
  { label: "Marks Entry", href: "/teacher/marks" },
];

type TeacherLayoutProps = {
  children: ReactNode;
};

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-text-primary dark:bg-background-dark dark:text-text-primary-dark md:flex-row">
      {/* Mobile Header & Nav */}
      <header className="border-b border-secondary-light bg-card md:hidden dark:border-border-dark dark:bg-card-dark">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Link href="/teacher/dashboard" className="text-xl font-bold tracking-tight text-secondary">
              SchoolMS
            </Link>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary dark:text-text-secondary-dark">
              Teacher Portal
            </p>
          </div>
          <Link
            href="/api/auth/signout"
            className="rounded-lg border border-secondary-light px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-background dark:border-border-dark"
          >
            Sign out
          </Link>
        </div>
        <nav className="overflow-x-auto px-4 py-2 pb-3">
          <ul className="flex gap-2">
            {navItems.map((item) => (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  className="block rounded-xl bg-secondary-light/50 px-4 py-2 text-sm font-medium text-secondary transition-colors hover:bg-secondary-light"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-secondary-light bg-card md:block dark:border-border-dark dark:bg-card-dark">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="px-6 py-8">
            <Link href="/teacher/dashboard" className="text-2xl font-bold tracking-tight text-secondary">
              SchoolMS
            </Link>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.3em] text-text-secondary dark:text-text-secondary-dark">
              Teacher Portal
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 py-4">
            <ul className="space-y-1.5">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-xl px-4 py-2.5 text-sm font-medium text-text-secondary transition-all hover:bg-secondary-light/30 hover:text-secondary dark:text-text-secondary-dark dark:hover:bg-secondary-light/10"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t border-secondary-light p-4 dark:border-border-dark">
            <Link
              href="/api/auth/signout"
              className="block rounded-xl px-4 py-2.5 text-sm font-medium text-text-secondary transition-all hover:bg-error/10 hover:text-error"
            >
              Sign out
            </Link>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden p-6 md:p-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
