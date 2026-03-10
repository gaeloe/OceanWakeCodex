export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/db";

export async function GET() {
  const [totalLeads, replied, unsubscribed, bounced, spam] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "REPLIED" } }),
    prisma.suppression.count({ where: { reason: "UNSUBSCRIBE", isActive: true } }),
    prisma.suppression.count({ where: { reason: "HARD_BOUNCE", isActive: true } }),
    prisma.suppression.count({ where: { reason: "SPAM_REPORT", isActive: true } }),
  ]);

  return Response.json({
    totalLeads,
    replyRate: totalLeads ? replied / totalLeads : 0,
    unsubscribeRate: totalLeads ? unsubscribed / totalLeads : 0,
    bounceRate: totalLeads ? bounced / totalLeads : 0,
    spamRate: totalLeads ? spam / totalLeads : 0,
    firstResponseSlaMinutes: 5,
  });
}
