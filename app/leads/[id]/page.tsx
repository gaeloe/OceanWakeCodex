export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import { assignLeadAction, sendLeadMessageAction, updateSequenceStatusAction } from "@/app/actions";
import { prisma } from "@/lib/db";

export default async function LeadDetailPage(context: { params: { id: string } | Promise<{ id: string }> }) {
  const resolved = await Promise.resolve(context.params);
  const [lead, agents] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: resolved.id },
      include: {
        assignedAgent: true,
        activities: { orderBy: { createdAt: "desc" } },
        messages: { orderBy: { createdAt: "desc" } },
        sequenceRuns: {
          orderBy: { createdAt: "desc" },
          include: { sequenceDefinition: true },
        },
        suppressions: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  if (!lead) {
    notFound();
  }

  const timeline = [
    ...lead.activities.map((item) => ({
      id: `activity-${item.id}`,
      kind: "activity" as const,
      createdAt: item.createdAt,
      title: item.activityType.replace(/_/g, " "),
      detail: JSON.stringify(item.payload),
    })),
    ...lead.messages.map((msg) => ({
      id: `message-${msg.id}`,
      kind: "message" as const,
      createdAt: msg.createdAt,
      title: `${msg.direction === "OUTBOUND" ? "Outbound" : "Inbound"} message`,
      detail: msg.subject,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const latestRun = lead.sequenceRuns[0];
  const activeSuppression = lead.suppressions.find((item) => item.isActive);

  return (
    <>
      <section className="panel hero">
        <div>
          <p className="brand-eyebrow" style={{ color: "var(--accent)" }}>
            Lead Detail
          </p>
          <h1>{lead.email}</h1>
          <p className="section-copy">
            Review full activity, message history, assignment state, and sequence control from one page.
          </p>
        </div>
        <div className="button-row">
          <a className="button secondary" href="/leads">
            Back to Leads
          </a>
        </div>
      </section>

      <section className="detail-grid">
        <div className="detail-stack">
          <section className="panel pad">
            <div className="toolbar">
              <div>
                <h2 className="section-title">Overview</h2>
                <p className="section-copy">Current contact status and operational flags.</p>
              </div>
              <div className="button-row">
                <span className="pill">{lead.status}</span>
                {latestRun ? (
                  <span className={`pill ${latestRun.status === "ACTIVE" ? "success" : latestRun.status === "PAUSED" ? "warning" : ""}`}>
                    {latestRun.status}
                  </span>
                ) : null}
                {activeSuppression ? <span className="pill danger">{activeSuppression.reason}</span> : null}
              </div>
            </div>

            <div className="form-grid two">
              <div className="list-item">
                <strong>Lead information</strong>
                <div className="muted">Name: {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown"}</div>
                <div className="muted">Source: {lead.source ?? "Unknown"}</div>
                <div className="muted">Created: {new Date(lead.createdAt).toLocaleString()}</div>
                <div className="muted">Updated: {new Date(lead.updatedAt).toLocaleString()}</div>
              </div>
              <div className="list-item">
                <strong>Ownership</strong>
                <div className="muted">Assigned agent: {lead.assignedAgent?.name ?? lead.assignedAgent?.email ?? "Unassigned"}</div>
                <div className="muted">Sequence definition: {latestRun?.sequenceDefinition?.name ?? "None"}</div>
                <div className="muted">Current step: {latestRun?.currentStepOrder ?? "N/A"}</div>
                <div className="muted">Stop reason: {latestRun?.stopReason ?? "None"}</div>
              </div>
            </div>
          </section>

          <section className="panel pad">
            <h2 className="section-title">Timeline</h2>
            <p className="section-copy">Combined activity log and message history.</p>

            {timeline.length ? (
              <ul className="timeline">
                {timeline.map((item) => (
                  <li className={`timeline-item ${item.kind}`} key={item.id}>
                    <div className="split">
                      <div>
                        <strong>{item.title}</strong>
                        <div className="muted">{item.detail}</div>
                      </div>
                      <div className="muted">{new Date(item.createdAt).toLocaleString()}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty">No timeline items recorded yet.</div>
            )}
          </section>
        </div>

        <div className="detail-stack">
          <section className="panel pad">
            <h2 className="section-title">Assign lead</h2>
            <p className="section-copy">Move ownership without leaving the detail view.</p>
            <form action={assignLeadAction} className="form-grid">
              <input type="hidden" name="leadId" value={lead.id} />
              <select className="select" name="agentId" defaultValue={lead.assignedAgentId ?? ""}>
                <option value="">Unassigned</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} · {agent.role}
                  </option>
                ))}
              </select>
              <button className="button" type="submit">
                Save assignment
              </button>
            </form>
          </section>

          <section className="panel pad">
            <h2 className="section-title">Sequence controls</h2>
            <p className="section-copy">Pause, resume, or stop the active run immediately.</p>
            <div className="button-row">
              <form action={updateSequenceStatusAction}>
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="action" value="pause" />
                <button className="button secondary" type="submit">
                  Pause
                </button>
              </form>
              <form action={updateSequenceStatusAction}>
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="action" value="resume" />
                <button className="button secondary" type="submit">
                  Resume
                </button>
              </form>
              <form action={updateSequenceStatusAction}>
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="action" value="stop" />
                <button className="button danger" type="submit">
                  Stop
                </button>
              </form>
            </div>
          </section>

          <section className="panel pad">
            <h2 className="section-title">Send manual reply</h2>
            <p className="section-copy">Useful for one-off outreach without leaving the lead record.</p>
            <form action={sendLeadMessageAction} className="form-grid">
              <input type="hidden" name="leadId" value={lead.id} />
              <input className="input" name="subject" placeholder="Subject line" required />
              <textarea className="textarea" name="bodyText" placeholder="Write the message body" required />
              <button className="button" type="submit">
                Send message
              </button>
            </form>
          </section>

          <section className="panel pad">
            <h2 className="section-title">Recent messages</h2>
            {lead.messages.length ? (
              <ul className="list">
                {lead.messages.slice(0, 5).map((msg) => (
                  <li className="list-item" key={msg.id}>
                    <strong>{msg.subject}</strong>
                    <div className="muted">
                      {msg.direction} · {new Date(msg.createdAt).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty">No messages sent or received yet.</div>
            )}
          </section>
        </div>
      </section>
    </>
  );
}
