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
          <p className="section-copy">Search, triage, and open the full lead history from a single queue.</p>
        </div>
        <div className="pill">{leads.length} visible</div>
      </section>

      <section className="panel pad">
        <div className="toolbar">
          <div>
            <h2 className="section-title">Filter queue</h2>
            <p className="section-copy">Use lightweight filters instead of paging through raw records.</p>
          </div>
          <form action="/leads" method="get">
            <input className="input" type="search" name="q" defaultValue={query} placeholder="Search email, name, source" />
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
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Status</th>
                <th>Sequence</th>
                <th>Assigned</th>
                <th>Source</th>
                <th>Opened</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const latestRun = lead.sequenceRuns[0];
                const activeSuppression = lead.suppressions[0];

                return (
                  <tr key={lead.id}>
                    <td>
                      <a href={`/leads/${lead.id}`}>
                        <strong>{lead.email}</strong>
                      </a>
                      <div className="muted">
                        {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "No contact name"}
                      </div>
                    </td>
                    <td>
                      <span className="pill">{lead.status}</span>
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
                    <td>{lead.source ?? "Unknown"}</td>
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
