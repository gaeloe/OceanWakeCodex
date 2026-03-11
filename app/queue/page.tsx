export const dynamic = "force-dynamic";
export const revalidate = 10;

import { snoozeLeadAction, updateSequenceStatusAction } from "@/app/actions";
import { getQueueData } from "@/lib/page-data";

type SearchParams = {
  priority?: string;
};

function minutesSince(date: Date) {
  return Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
}

function getOpenCount(
  messages: Array<{
    events: Array<{ eventType: string }>;
  }>
) {
  return messages.reduce(
    (count, message) => count + message.events.filter((event) => event.eventType === "OPENED").length,
    0
  );
}

function buildQueueItem(
  lead: Awaited<ReturnType<typeof getQueueData>>[number]
):
  | {
      priority: "P0" | "P1" | "P2" | "P3" | "P4";
      label: string;
      preview: string;
      actionLabel: string;
    }
  | null {
  const latestRun = lead.sequenceRuns[0];
  const inbound = lead.messages.find((message) => message.direction === "INBOUND");
  const outbound = lead.messages.find((message) => message.direction === "OUTBOUND");
  const openCount = getOpenCount(lead.messages);

  if (!outbound && minutesSince(lead.createdAt) >= 3) {
    return {
      priority: "P0",
      label: "SLA breach imminent",
      preview: `${lead.source ?? "Unknown source"} · ${minutesSince(lead.createdAt)} min since creation`,
      actionLabel: "Send now",
    };
  }

  if (inbound) {
    return {
      priority: "P1",
      label: "Lead replied",
      preview: inbound.bodyText.slice(0, 96) + (inbound.bodyText.length > 96 ? "..." : ""),
      actionLabel: "Open thread",
    };
  }

  if (!outbound) {
    return {
      priority: "P2",
      label: "New lead, no email yet",
      preview: `${lead.source ?? "Unknown"} · needs first-touch response`,
      actionLabel: "Review + send",
    };
  }

  if (latestRun?.status === "PAUSED" || latestRun?.status === "STOPPED") {
    return {
      priority: "P3",
      label: "Sequence paused by system",
      preview: latestRun.stopReason ?? "Sequence needs intervention",
      actionLabel: "Fix + resume",
    };
  }

  if (openCount >= 2 && !inbound) {
    return {
      priority: "P4",
      label: "Lead opened 2+ times, no reply",
      preview: `${openCount} opens · step ${latestRun?.currentStepOrder ?? "n/a"}`,
      actionLabel: "Send personal note",
    };
  }

  return null;
}

export default async function QueuePage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const resolved = await Promise.resolve(searchParams);
  const priority = resolved?.priority ?? "ALL";
  const leads = await getQueueData();
  const items = leads
    .map((lead) => {
      const queueItem = buildQueueItem(lead);
      return queueItem ? { lead, queueItem } : null;
    })
    .filter(Boolean)
    .filter((entry) => (priority === "ALL" ? true : entry?.queueItem.priority === priority)) as Array<{
    lead: (typeof leads)[number];
    queueItem: NonNullable<ReturnType<typeof buildQueueItem>>;
  }>;

  return (
    <>
      <section className="panel hero">
        <div>
          <p className="brand-eyebrow" style={{ color: "var(--accent)" }}>
            Default Agent Home
          </p>
          <h1>Action queue</h1>
          <p className="section-copy">Every card answers one question: what needs my attention right now?</p>
        </div>
        <div className="button-row">
          {["ALL", "P0", "P1", "P2", "P3", "P4"].map((value) => (
            <a key={value} className={`pill ${priority === value ? "success" : ""}`} href={`/queue?priority=${value}`}>
              {value}
            </a>
          ))}
        </div>
      </section>

      {items.length ? (
        <section className="queue-list">
          {items.map(({ lead, queueItem }) => (
            <article className={`panel pad queue-card ${queueItem.priority.toLowerCase()}`} key={lead.id}>
              <a className="queue-main" href={`/leads/${lead.id}`}>
                <div className="pill">{queueItem.priority}</div>
                <h2 className="card-title">{[lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email}</h2>
                <p className="section-copy">{queueItem.label}</p>
                <div className="muted">{queueItem.preview}</div>
                <div className="queue-meta">
                  <span>{lead.source ?? "Unknown source"}</span>
                  <span>{lead.assignedAgent?.name ?? "Unassigned"}</span>
                  <span>{minutesSince(lead.updatedAt)} min ago</span>
                </div>
                <div className="queue-meta">
                  {[lead.areaInterest, lead.budgetRange, lead.country].filter(Boolean).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                {lead.tags.length ? (
                  <div className="tag-row">
                    {lead.tags.map((entry) => (
                      <span className="pill" key={entry.tag.id}>
                        {entry.tag.label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </a>
              <div className="queue-side">
                <a className="button" href={`/leads/${lead.id}`}>
                  {queueItem.actionLabel}
                </a>
                <form action={snoozeLeadAction}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="hours" value="4" />
                  <button className="button secondary" type="submit">
                    Snooze 4h
                  </button>
                </form>
                <form action={updateSequenceStatusAction}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="action" value={lead.sequenceRuns[0]?.status === "PAUSED" ? "resume" : "pause"} />
                  <button className="button secondary" type="submit">
                    {lead.sequenceRuns[0]?.status === "PAUSED" ? "Resume" : "Pause sequence"}
                  </button>
                </form>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="panel pad">
          <div className="empty queue-empty">All caught up. No leads need attention right now.</div>
        </section>
      )}
    </>
  );
}
