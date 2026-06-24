"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

const NAV = [
  { label: "Dashboard", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Roles & Permissions", href: "/admin/roles" },
  { label: "Content Moderation", href: "/admin/content" },
  { label: "Submissions", href: "/admin/submissions" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Settings", href: "/admin/settings" },
  { label: "Audit Logs", href: "/admin/audit" },
];

export default function AdminShell({ user, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await api.post("/auth/logout").catch(() => {});
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-lagoon/10 bg-lagoon-900 text-frost-50 transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 px-6 py-5">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="15" className="fill-marigold" />
            <path d="M6 19c4-1 6-9 10-9s5 8 10 8" className="stroke-lagoon-900" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
          <span className="font-display text-lg font-semibold">Anthroplanet</span>
        </div>
        <nav className="px-3 py-2">
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`mb-1 block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-marigold text-lagoon-900"
                    : "text-frost/70 hover:bg-white/5 hover:text-frost-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-lagoon/10 bg-white px-5 py-3.5 sm:px-8">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-lagoon-900 lg:hidden"
            aria-label="Toggle menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-lagoon-900">{user.name}</p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-moss">
                {user.roles?.[0] || "Admin"}
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lagoon-900 font-semibold text-frost-50">
              {user.name?.charAt(0)?.toUpperCase() || "A"}
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-lagoon/15 px-4 py-2 text-sm font-semibold text-lagoon-900 transition-colors hover:bg-frost-50"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
