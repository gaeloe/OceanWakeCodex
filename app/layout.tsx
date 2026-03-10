import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Arial, sans-serif", padding: 24 }}>
        <h1>Ocean Lead Responder</h1>
        <nav style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <a href="/dashboard">Dashboard</a>
          <a href="/leads">Leads</a>
          <a href="/templates">Templates</a>
          <a href="/audit-log">Audit Log</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
