export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/db";

export default async function AuditLogPage() {
  const rows = await prisma.leadActivity.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { lead: true, actorUser: true },
  });

  return (
    <>
      <section className="panel hero">
        <div>
          <p className="brand-eyebrow" style={{ color: "var(--accent)" }}>
            Operational History
          </p>
          <h1>Audit log</h1>
          <p className="section-copy">Chronological record of lead actions across the internal tool.</p>
        </div>
      </section>

      <section className="panel pad">
        {rows.length ? (
          <ul className="list">
            {rows.map((row) => (
              <li className="list-item" key={row.id}>
                <div className="list-row">
                  <div>
                    <strong>{row.activityType.replace(/_/g, " ")}</strong>
                    <div className="muted">
                      {row.lead.email}
                      {row.actorUser ? ` · ${row.actorUser.name}` : ""}
                    </div>
                  </div>
                  <div className="muted">{new Date(row.createdAt).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">No audit entries yet.</div>
        )}
      </section>
    </>
  );
}
