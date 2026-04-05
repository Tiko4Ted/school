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
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-cyan-100 bg-white md:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="border-b border-cyan-100 px-6 py-5">
            <Link href="/teacher/dashboard" className="text-lg font-bold tracking-tight text-slate-900">
              SchoolMS
            </Link>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.2em] text-cyan-600">
              Teacher Panel
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-cyan-50 hover:text-slate-900"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t border-cyan-100 px-3 py-4">
            <Link
              href="/api/auth/signout"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-cyan-50 hover:text-slate-900"
            >
              Sign out
            </Link>
          </div>
        </div>
      </aside>
      <div className="flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
}
