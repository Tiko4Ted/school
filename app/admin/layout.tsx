import { ReactNode } from "react";
import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Classes", href: "/admin/classes" },
  { label: "Subjects", href: "/admin/subjects" },
  { label: "Academic Years", href: "/admin/academicyears" },
  { label: "Students", href: "/admin/students" },
  { label: "Teachers", href: "/admin/teachers" },
  { label: "Exams", href: "/admin/exams" },
  { label: "Merit Lists", href: "/admin/merit-lists" },
  { label: "Reports", href: "/admin/reports" },
];

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-text-primary dark:bg-background-dark dark:text-text-primary-dark md:flex-row">
      {/* Mobile Header & Nav */}
      <header className="border-b border-border-subtle bg-card md:hidden dark:border-border-dark dark:bg-card-dark">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Link href="/admin/dashboard" className="text-xl font-bold tracking-tight text-primary">
              SchoolMS
            </Link>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary dark:text-text-secondary-dark">
              Admin Portal
            </p>
          </div>
          <Link
            href="/api/auth/signout"
            className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-background dark:border-border-dark"
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
                  className="block rounded-xl bg-primary-light/30 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary-light/50"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border-subtle bg-card md:block dark:border-border-dark dark:bg-card-dark">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="px-6 py-8">
            <Link href="/admin/dashboard" className="text-2xl font-bold tracking-tight text-primary">
              SchoolMS
            </Link>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.3em] text-text-secondary dark:text-text-secondary-dark">
              Admin Portal
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 py-4">
            <ul className="space-y-1.5">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-xl px-4 py-2.5 text-sm font-medium text-text-secondary transition-all hover:bg-primary-light/30 hover:text-primary dark:text-text-secondary-dark dark:hover:bg-primary-light/10"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t border-border-subtle p-4 dark:border-border-dark">
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
