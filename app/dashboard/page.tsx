export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const [totalLeads, replied, unsubscribed, bounced, spam, activeSequences, pausedSequences, recentLeads, recentActivity] =
    await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: "REPLIED" } }),
      prisma.suppression.count({ where: { reason: "UNSUBSCRIBE", isActive: true } }),
      prisma.suppression.count({ where: { reason: "HARD_BOUNCE", isActive: true } }),
      prisma.suppression.count({ where: { reason: "SPAM_REPORT", isActive: true } }),
      prisma.sequenceRun.count({ where: { status: "ACTIVE" } }),
      prisma.sequenceRun.count({ where: { status: "PAUSED" } }),
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { assignedAgent: true },
      }),
      prisma.leadActivity.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { lead: true, actorUser: true },
      }),
    ]);

  const replyRate = totalLeads ? (replied / totalLeads) * 100 : 0;
  const unsubscribeRate = totalLeads ? (unsubscribed / totalLeads) * 100 : 0;
  const bounceRate = totalLeads ? (bounced / totalLeads) * 100 : 0;
  const spamRate = totalLeads ? (spam / totalLeads) * 100 : 0;

  return (
    <>
      <section className="panel hero">
        <div>
          <p className="brand-eyebrow" style={{ color: "var(--accent)" }}>
            Today&apos;s Operating View
          </p>
          <h1>Lead response dashboard</h1>
          <p className="section-copy">
            Monitor lead volume, sequence health, and deliverability without digging through raw tables.
          </p>
        </div>
        <div className="button-row">
          <a className="button secondary" href="/leads">
            Review Leads
          </a>
          <a className="button" href="/templates">
            Update Templates
          </a>
        </div>
      </section>

      <section className="metrics">
        <article className="metric-card">
          <p className="metric-label">Total Leads</p>
          <p className="metric-value">{totalLeads}</p>
          <p className="metric-footnote">All ingested leads in the system.</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Reply Rate</p>
          <p className="metric-value">{replyRate.toFixed(1)}%</p>
          <p className="metric-footnote">{replied} replied leads.</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Unsubscribes</p>
          <p className="metric-value">{unsubscribeRate.toFixed(1)}%</p>
          <p className="metric-footnote">{unsubscribed} active suppressions.</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Bounces</p>
          <p className="metric-value">{bounceRate.toFixed(1)}%</p>
          <p className="metric-footnote">{bounced} hard bounce suppressions.</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Spam Rate</p>
          <p className="metric-value">{spamRate.toFixed(1)}%</p>
          <p className="metric-footnote">{spam} spam-report suppressions.</p>
        </article>
      </section>

      <section className="grid-2">
        <div className="stack">
          <section className="panel pad">
            <div className="toolbar">
              <div>
                <h2 className="section-title">Recent leads</h2>
                <p className="section-copy">Newest records waiting for follow-up or review.</p>
              </div>
              <a className="button secondary" href="/leads">
                Open full list
              </a>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Status</th>
                    <th>Agent</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <a href={`/leads/${lead.id}`}>
                          <strong>{lead.email}</strong>
                        </a>
                        <div className="muted">
                          {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "No name provided"}
                        </div>
                      </td>
                      <td>
                        <span className="pill">{lead.status}</span>
                      </td>
                      <td>{lead.assignedAgent?.name ?? lead.assignedAgent?.email ?? "Unassigned"}</td>
                      <td>{new Date(lead.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel pad">
            <h2 className="section-title">Recent activity</h2>
            <p className="section-copy">Latest actions across assignment, messaging, and sequence control.</p>

            {recentActivity.length ? (
              <ul className="list">
                {recentActivity.map((item) => (
                  <li className="list-item" key={item.id}>
                    <div className="list-row">
                      <div>
                        <strong>{item.activityType.replace(/_/g, " ")}</strong>
                        <div className="muted">
                          {item.lead.email}
                          {item.actorUser ? ` · ${item.actorUser.name}` : ""}
                        </div>
                      </div>
                      <div className="muted">{new Date(item.createdAt).toLocaleString()}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty">No activity has been recorded yet.</div>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="panel pad">
            <h2 className="section-title">Sequence health</h2>
            <p className="section-copy">Quick check on automation load and control state.</p>
            <ul className="list">
              <li className="list-item">
                <div className="split">
                  <span>Active sequence runs</span>
                  <span className="pill success">{activeSequences}</span>
                </div>
              </li>
              <li className="list-item">
                <div className="split">
                  <span>Paused sequence runs</span>
                  <span className="pill warning">{pausedSequences}</span>
                </div>
              </li>
              <li className="list-item">
                <div className="split">
                  <span>First-response SLA target</span>
                  <span className="pill">5 min</span>
                </div>
              </li>
            </ul>
          </section>

          <section className="panel pad">
            <h2 className="section-title">Recommended next steps</h2>
            <ul className="list">
              <li className="list-item">Review unassigned new leads and route them to agents.</li>
              <li className="list-item">Check templates before enabling any higher-volume sequence traffic.</li>
              <li className="list-item">Confirm Vercel production env vars before relying on the deployed instance.</li>
            </ul>
          </section>
        </div>
      </section>
    </>
  );
}
