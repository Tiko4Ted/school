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
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="border-b border-slate-200 px-6 py-5">
            <Link href="/admin/dashboard" className="text-lg font-bold tracking-tight text-slate-900">
              SchoolMS
            </Link>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Admin Panel
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t border-slate-200 px-3 py-4">
            <Link
              href="/api/auth/signout"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
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
