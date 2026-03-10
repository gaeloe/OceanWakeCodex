export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/db";

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div>
      <h2>Leads</h2>
      <table>
        <thead><tr><th>Email</th><th>Status</th><th>Agent</th><th>Opened</th></tr></thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td>{lead.email}</td><td>{lead.status}</td><td>{lead.assignedAgentId ?? "-"}</td>
              <td><a href={`/leads/${lead.id}`}>Open</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
