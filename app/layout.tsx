import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";

const navItems = [
  { href: "/queue", label: "Queue" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/templates", label: "Templates" },
  { href: "/audit-log", label: "Audit Log" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div>
              <p className="brand-eyebrow">Internal Tool</p>
              <h1 className="brand-title">Ocean Lead Responder</h1>
              <p className="brand-copy">
                Track inbound leads, monitor reply quality, and keep outbound sequences under control.
              </p>
            </div>

            <nav className="nav" aria-label="Primary">
              {navItems.map((item) => (
                <Link key={item.href} className="nav-link" href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="sidebar-note">
              Built for quick internal ops. The workflow stays server-rendered and simple so the team can use it
              without waiting on a larger app rewrite.
            </div>
          </aside>

          <main className="content">{children}</main>
        </div>
        <nav className="mobile-nav" aria-label="Mobile">
          {navItems.slice(0, 4).map((item) => (
            <Link key={item.href} className="mobile-nav-link" href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </body>
    </html>
  );
}
