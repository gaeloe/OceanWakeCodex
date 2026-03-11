export const dynamic = "force-dynamic";
export const revalidate = 20;

import { notFound } from "next/navigation";
import {
  assignLeadAction,
  sendLeadMessageAction,
  updateLeadContextAction,
  updateSequenceStatusAction,
} from "@/app/actions";
import { getLeadDetailData } from "@/lib/page-data";

type SearchParams = {
  template?: string;
  saved?: string;
  sent?: string;
};

const statusOptions = ["NEW", "CONTACTED", "REPLIED", "CLOSED"] as const;

function valueOrFallback(value: string | null | undefined, fallback: string) {
  return value?.trim() ? value : fallback;
}

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearch = await Promise.resolve(searchParams);
  const { lead, agents, templates, tags } = await getLeadDetailData(resolvedParams.id);

  if (!lead) {
    notFound();
  }

  const latestRun = lead.sequenceRuns[0];
  const activeSuppression = lead.suppressions.find((item) => item.isActive);
  const sequenceSteps = latestRun?.sequenceDefinition?.steps ?? [];
  const selectedTemplate =
    templates.find((template) => template.id === resolvedSearch?.template) ??
    templates.find((template) => template.category === "REPLY") ??
    templates[0] ??
    null;
  const selectedLeadTags = lead.tags.map((item) => item.tag.label).join(", ");
  const saveSuccess = resolvedSearch?.saved === "1";
  const sentSuccess = resolvedSearch?.sent === "1";
  const groupedTemplates = templates.reduce<Record<string, typeof templates>>((groups, template) => {
    const key = template.category.replace(/_/g, " ");
    groups[key] = groups[key] ?? [];
    groups[key].push(template);
    return groups;
  }, {});

  return (
    <>
      <section className="panel hero">
        <div>
          <p className="brand-eyebrow" style={{ color: "var(--accent)" }}>
            Lead Workspace
          </p>
          <h1>{[lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email}</h1>
          <p className="section-copy">
            Conversation-first workspace with editable context, visible automation state, and quick response tools.
          </p>
        </div>
        <div className="button-row">
          <span className="pill">{lead.status}</span>
          {lead.snoozedUntil && lead.snoozedUntil > new Date() ? (
            <span className="pill warning">Snoozed until {new Date(lead.snoozedUntil).toLocaleString()}</span>
          ) : null}
          <a className="button secondary" href="/queue">
            Back to Queue
          </a>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="thread-panel panel pad">
          <div className="toolbar">
            <div>
              <h2 className="section-title">Conversation thread</h2>
              <p className="section-copy">Agents can reply without losing context or leaving the lead record.</p>
            </div>
            <div className="button-row">
              {latestRun ? (
                <span className={`pill ${latestRun.status === "ACTIVE" ? "success" : latestRun.status === "PAUSED" ? "warning" : ""}`}>
                  {latestRun.status}
                </span>
              ) : (
                <span className="pill">No sequence</span>
              )}
            </div>
          </div>

          <div className="context-chip">
            {[lead.source, lead.areaInterest, lead.budgetRange].filter(Boolean).join(" · ")}
          </div>

          {saveSuccess ? <div className="empty">Lead context updated.</div> : null}
          {sentSuccess ? <div className="empty">Message sent and lead returned to the live queue.</div> : null}

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
                <p className="section-copy">Insert a canned response by selecting it from the template palette.</p>
              </div>
              {selectedTemplate ? <span className="pill success">Using {selectedTemplate.name}</span> : null}
            </div>

            <div className="template-palette">
              {Object.entries(groupedTemplates).map(([group, groupTemplates]) => (
                <details className="template-palette-item" key={group} open={group === "REPLY"}>
                  <summary>{group}</summary>
                  <div className="template-preview">
                    {groupTemplates.map((template) => (
                      <div className="template-choice" key={template.id}>
                        <div>
                          <strong>{template.name}</strong>
                          <p>{template.subject}</p>
                        </div>
                        <a className="button secondary" href={`/leads/${lead.id}?template=${template.id}`}>
                          Use
                        </a>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>

            <form action={sendLeadMessageAction} className="form-grid">
              <input type="hidden" name="leadId" value={lead.id} />
              <input
                className="input"
                name="subject"
                placeholder="Subject line"
                defaultValue={selectedTemplate?.subject ?? ""}
                required
              />
              <textarea
                className="textarea"
                name="bodyText"
                placeholder="Type a reply or choose a template above"
                defaultValue={selectedTemplate?.bodyText ?? ""}
                required
              />
              <div className="button-row">
                <button className="button" type="submit">
                  Send now
                </button>
                {selectedTemplate ? (
                  <a className="button secondary" href={`/templates?template=${selectedTemplate.id}`}>
                    Edit template
                  </a>
                ) : null}
              </div>
            </form>
          </section>
        </div>

        <div className="detail-stack">
          <section className="panel pad sticky-card">
            <div className="toolbar">
              <div>
                <h2 className="section-title">Lead context</h2>
                <p className="section-copy">Editable context card that stays next to the thread.</p>
              </div>
              {activeSuppression ? <span className="pill danger">{activeSuppression.reason}</span> : null}
            </div>

            <form action={updateLeadContextAction} className="form-grid">
              <input type="hidden" name="leadId" value={lead.id} />
              <div className="form-grid two">
                <input className="input" name="firstName" placeholder="First name" defaultValue={lead.firstName ?? ""} />
                <input className="input" name="lastName" placeholder="Last name" defaultValue={lead.lastName ?? ""} />
              </div>
              <div className="form-grid two">
                <input className="input" name="phone" placeholder="Phone" defaultValue={lead.phone ?? ""} />
                <select className="select" name="status" defaultValue={lead.status}>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-grid two">
                <input className="input" name="source" placeholder="Source" defaultValue={lead.source ?? ""} />
                <input className="input" name="utmCampaign" placeholder="UTM campaign" defaultValue={lead.utmCampaign ?? ""} />
              </div>
              <div className="form-grid two">
                <input className="input" name="country" placeholder="Country" defaultValue={lead.country ?? ""} />
                <input className="input" name="language" placeholder="Language" defaultValue={lead.language ?? ""} />
              </div>
              <div className="form-grid two">
                <input className="input" name="propertyType" placeholder="Property type" defaultValue={lead.propertyType ?? ""} />
                <input className="input" name="areaInterest" placeholder="Area of interest" defaultValue={lead.areaInterest ?? ""} />
              </div>
              <input className="input" name="budgetRange" placeholder="Budget range" defaultValue={lead.budgetRange ?? ""} />
              <textarea
                className="textarea"
                name="tags"
                placeholder="Tags, separated by commas"
                defaultValue={selectedLeadTags}
              />
              <textarea
                className="textarea"
                name="notes"
                placeholder="Internal notes and qualification context"
                defaultValue={lead.notes ?? ""}
              />
              <div className="tag-row">
                {lead.tags.map((entry) => (
                  <span className="pill" key={entry.tag.id}>
                    {entry.tag.label}
                  </span>
                ))}
                {!lead.tags.length ? <span className="muted">No tags yet.</span> : null}
              </div>
              {!!tags.length ? (
                <div className="muted">
                  Suggested tags: {tags.slice(0, 8).map((tag) => tag.label).join(", ")}
                </div>
              ) : null}
              <div className="button-row">
                <button className="button secondary" type="submit">
                  Save context
                </button>
                {lead.snoozedUntil ? (
                  <button className="button secondary" type="submit" name="clearSnooze" value="1">
                    Clear snooze
                  </button>
                ) : null}
              </div>
            </form>

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
              <button className="button secondary" type="submit">
                Save assignment
              </button>
            </form>

            <div className="list" style={{ marginTop: 16 }}>
              <div className="list-item">
                <strong>Identity</strong>
                <div className="muted">{valueOrFallback(lead.email, "No email")}</div>
                <div className="muted">{valueOrFallback(lead.phone, "No phone captured")}</div>
              </div>
            </div>
          </section>

          <section className="panel pad">
            <div className="toolbar">
              <div>
                <h2 className="section-title">Sequence rail</h2>
                <p className="section-copy">Automation is visible, previewable, and manually overrideable.</p>
              </div>
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
                        <div className="muted">{step.template.category.replace(/_/g, " ")}</div>
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
