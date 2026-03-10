export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const [totalLeads, replied, unsubscribed, bounced, spam] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "REPLIED" } }),
    prisma.suppression.count({ where: { reason: "UNSUBSCRIBE", isActive: true } }),
    prisma.suppression.count({ where: { reason: "HARD_BOUNCE", isActive: true } }),
    prisma.suppression.count({ where: { reason: "SPAM_REPORT", isActive: true } }),
  ]);

  return (
    <div>
      <h2>Summary</h2>
      <ul>
        <li>Total Leads: {totalLeads}</li>
        <li>Reply Rate: {(totalLeads ? (replied / totalLeads) * 100 : 0).toFixed(1)}%</li>
        <li>Unsubscribe Rate: {(totalLeads ? (unsubscribed / totalLeads) * 100 : 0).toFixed(1)}%</li>
        <li>Bounce Rate: {(totalLeads ? (bounced / totalLeads) * 100 : 0).toFixed(1)}%</li>
        <li>Spam Rate: {(totalLeads ? (spam / totalLeads) * 100 : 0).toFixed(1)}%</li>
        <li>SLA target: 5 minutes</li>
      </ul>
    </div>
  );
}
