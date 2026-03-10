export const dynamic = "force-dynamic";
export const revalidate = 20;

import { notFound } from "next/navigation";
import { assignLeadAction, sendLeadMessageAction, updateSequenceStatusAction } from "@/app/actions";
import { getLeadDetailData } from "@/lib/page-data";

export default async function LeadDetailPage(context: { params: { id: string } | Promise<{ id: string }> }) {
  const resolved = await Promise.resolve(context.params);
  const { lead, agents, templates } = await getLeadDetailData(resolved.id);

  if (!lead) {
    notFound();
  }

  const latestRun = lead.sequenceRuns[0];
  const activeSuppression = lead.suppressions.find((item) => item.isActive);
  const sequenceSteps = latestRun?.sequenceDefinition?.steps ?? [];

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

      <section className="workspace-grid">
        <div className="thread-panel panel pad">
          <div className="toolbar">
            <div>
              <h2 className="section-title">Conversation thread</h2>
              <p className="section-copy">Chat-first workspace, not a log viewer.</p>
            </div>
            <div className="button-row">
              <span className="pill">{lead.status}</span>
              {latestRun ? (
                <span className={`pill ${latestRun.status === "ACTIVE" ? "success" : latestRun.status === "PAUSED" ? "warning" : ""}`}>
                  {latestRun.status}
                </span>
              ) : null}
            </div>
          </div>

          <div className="context-chip">
            {[lead.source, lead.email].filter(Boolean).join(" · ")}
          </div>

          <div className="chat-thread">
            {lead.messages.length ? (
              lead.messages.map((message) => (
                <div key={message.id}>
                  {message.events.map((event) => (
                    <div className="event-divider" key={event.id}>
                      {event.eventType} · {new Date(event.occurredAt).toLocaleString()}
                    </div>
                  ))}
                  <article className={`chat-bubble ${message.direction === "OUTBOUND" ? "outbound" : "inbound"}`}>
                    <div className="chat-bubble-meta">
                      <strong>{message.subject}</strong>
                      <span>{new Date(message.createdAt).toLocaleString()}</span>
                    </div>
                    <p>{message.bodyText}</p>
                  </article>
                </div>
              ))
            ) : (
              <div className="empty">No conversation yet. Send the first-touch email from the composer below.</div>
            )}

            {lead.activities.slice(0, 10).map((item) => (
              <div className="event-divider" key={item.id}>
                {item.activityType.replace(/_/g, " ")} · {new Date(item.createdAt).toLocaleString()}
              </div>
            ))}
          </div>

          <section className="composer-dock">
            <div className="toolbar">
              <div>
                <h3 className="section-title">Reply composer</h3>
                <p className="section-copy">Templates stay within reach while you write.</p>
              </div>
            </div>

            <div className="template-palette">
              {templates.map((template) => (
                <details className="template-palette-item" key={template.id}>
                  <summary>{template.name}</summary>
                  <div className="template-preview">
                    <strong>{template.subject}</strong>
                    <p>{template.bodyText.slice(0, 160)}{template.bodyText.length > 160 ? "..." : ""}</p>
                  </div>
                </details>
              ))}
            </div>

            <form action={sendLeadMessageAction} className="form-grid">
              <input type="hidden" name="leadId" value={lead.id} />
              <input className="input" name="subject" placeholder="Subject line" required />
              <textarea className="textarea" name="bodyText" placeholder="Type a reply or use a template above" required />
              <div className="button-row">
                <button className="button" type="submit">Send now</button>
                <span className="muted">One-click canned reply insertion is the next pass after this UX layer.</span>
              </div>
            </form>
          </section>
        </div>

        <div className="detail-stack">
          <section className="panel pad sticky-card">
            <div className="toolbar">
              <div>
                <h2 className="section-title">Lead context</h2>
                <p className="section-copy">Compact context card that stays visible while the agent composes.</p>
              </div>
              {activeSuppression ? <span className="pill danger">{activeSuppression.reason}</span> : null}
            </div>

            <div className="list">
              <div className="list-item">
                <strong>Identity</strong>
                <div className="muted">{[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown name"}</div>
                <div className="muted">{lead.email}</div>
              </div>
              <div className="list-item">
                <strong>Enquiry context</strong>
                <div className="muted">Source: {lead.source ?? "Unknown"}</div>
                <div className="muted">Assigned: {lead.assignedAgent?.name ?? lead.assignedAgent?.email ?? "Unassigned"}</div>
                <div className="muted">Created: {new Date(lead.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <form action={assignLeadAction} className="form-grid" style={{ marginTop: 16 }}>
              <input type="hidden" name="leadId" value={lead.id} />
              <select className="select" name="agentId" defaultValue={lead.assignedAgentId ?? ""}>
                <option value="">Unassigned</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} · {agent.role}
                  </option>
                ))}
              </select>
              <button className="button secondary" type="submit">Save assignment</button>
            </form>
          </section>

          <section className="panel pad">
            <div className="toolbar">
              <div>
                <h2 className="section-title">Sequence rail</h2>
                <p className="section-copy">Make automation transparent and intervenable.</p>
              </div>
              <div className="button-row">
                <form action={updateSequenceStatusAction}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="action" value="pause" />
                  <button className="button secondary" type="submit">Pause</button>
                </form>
                <form action={updateSequenceStatusAction}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="action" value="resume" />
                  <button className="button secondary" type="submit">Resume</button>
                </form>
                <form action={updateSequenceStatusAction}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="action" value="stop" />
                  <button className="button danger" type="submit">Stop</button>
                </form>
              </div>
            </div>

            {sequenceSteps.length ? (
              <ul className="sequence-rail">
                {sequenceSteps.map((step) => {
                  const isComplete = latestRun ? step.stepOrder < latestRun.currentStepOrder : false;
                  const isCurrent = latestRun ? step.stepOrder === latestRun.currentStepOrder : false;

                  return (
                    <li className={`sequence-step ${isCurrent ? "current" : ""}`} key={step.id}>
                      <div className="sequence-step-dot">{step.stepOrder}</div>
                      <div className="sequence-step-content">
                        <div className="split">
                          <strong>{step.template.subject}</strong>
                          <span className={`pill ${isComplete ? "success" : isCurrent ? "warning" : ""}`}>
                            {isComplete ? "Sent" : isCurrent ? "Next" : "Future"}
                          </span>
                        </div>
                        <div className="muted">
                          {isCurrent ? `Scheduled after ${step.delayMinutes} minutes` : `Delay ${step.delayMinutes} minutes`}
                        </div>
                        <details className="template-preview">
                          <summary>Preview email</summary>
                          <p>{step.template.bodyText}</p>
                        </details>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="empty">No sequence steps configured yet.</div>
            )}
          </section>
        </div>
      </section>
    </>
  );
}
