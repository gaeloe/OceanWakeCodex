export const dynamic = "force-dynamic";
export const revalidate = 15;

import { getLeadsPageData } from "@/lib/page-data";

type SearchParams = {
  q?: string;
  status?: string;
};

const statusOptions = ["ALL", "NEW", "CONTACTED", "REPLIED", "CLOSED"] as const;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const resolved = await Promise.resolve(searchParams);
  const query = resolved?.q?.trim() ?? "";
  const status = resolved?.status?.trim() ?? "ALL";

  const leads = await getLeadsPageData(query, status);

  return (
    <>
      <section className="panel hero">
        <div>
          <p className="brand-eyebrow" style={{ color: "var(--accent)" }}>
            Lead Inbox
          </p>
          <h1>Leads</h1>
          <p className="section-copy">Search across people, tags, areas, and source context without dropping into raw records.</p>
        </div>
        <div className="pill">{leads.length} visible</div>
      </section>

      <section className="panel pad">
        <div className="toolbar">
          <div>
            <h2 className="section-title">Filter queue</h2>
            <p className="section-copy">Search by email, name, area, country, source, or tags.</p>
          </div>
          <form action="/leads" method="get">
            <input className="input" type="search" name="q" defaultValue={query} placeholder="Search leads or tags" />
            <select className="select" name="status" defaultValue={status}>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "All statuses" : option}
                </option>
              ))}
            </select>
            <button className="button" type="submit">
              Apply
            </button>
          </form>
        </div>
      </section>

      <section className="panel pad">
        <div className="toolbar">
          <div>
            <h2 className="section-title">Bulk actions</h2>
            <p className="section-copy">The workflow scaffolding is visible so the operator path stays obvious.</p>
          </div>
          <div className="button-row">
            <button className="button secondary" type="button">
              Pause selected
            </button>
            <button className="button secondary" type="button">
              Resume selected
            </button>
            <button className="button secondary" type="button">
              Retag selected
            </button>
            <button className="button secondary" type="button">
              Export CSV
            </button>
          </div>
        </div>
      </section>

      <section className="panel pad">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Lead</th>
                <th>Context</th>
                <th>Status</th>
                <th>Sequence</th>
                <th>Assigned</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const latestRun = lead.sequenceRuns[0];
                const activeSuppression = lead.suppressions[0];

                return (
                  <tr key={lead.id}>
                    <td>
                      <input type="checkbox" aria-label={`Select ${lead.email}`} />
                    </td>
                    <td>
                      <a href={`/leads/${lead.id}`}>
                        <strong>{[lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email}</strong>
                      </a>
                      <div className="muted">{lead.email}</div>
                      <div className="muted">{lead.phone ?? "No phone captured"}</div>
                    </td>
                    <td>
                      <div className="muted">{[lead.source, lead.country, lead.areaInterest].filter(Boolean).join(" · ") || "No context yet"}</div>
                      {lead.tags.length ? (
                        <div className="tag-row" style={{ marginTop: 8 }}>
                          {lead.tags.map((entry) => (
                            <span className="pill" key={entry.tag.id}>
                              {entry.tag.label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span className="pill">{lead.status}</span>
                      {lead.snoozedUntil && lead.snoozedUntil > new Date() ? (
                        <div style={{ marginTop: 8 }}>
                          <span className="pill warning">Snoozed</span>
                        </div>
                      ) : null}
                      {activeSuppression ? (
                        <div style={{ marginTop: 8 }}>
                          <span className="pill danger">{activeSuppression.reason}</span>
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {latestRun ? <span className="pill success">{latestRun.status}</span> : <span className="muted">No run</span>}
                    </td>
                    <td>{lead.assignedAgent?.name ?? lead.assignedAgent?.email ?? "Unassigned"}</td>
                    <td>
                      <a className="button secondary" href={`/leads/${lead.id}`}>
                        Open
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!leads.length ? <div className="empty">No leads matched the current filters.</div> : null}
      </section>
    </>
  );
}
