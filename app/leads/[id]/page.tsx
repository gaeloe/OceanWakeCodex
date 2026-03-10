export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/db";

export default async function LeadDetailPage(context: { params: { id: string } | Promise<{ id: string }> }) {
  const resolved = await Promise.resolve(context.params);
  const lead = await prisma.lead.findUnique({
    where: { id: resolved.id },
    include: {
      activities: { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) {
    return <p>Lead not found.</p>;
  }

  return (
    <div>
      <h2>{lead.email}</h2>
      <p>Status: {lead.status}</p>
      <h3>Timeline</h3>
      <ul>
        {lead.activities.map((item) => (
          <li key={item.id}>{item.activityType} ({new Date(item.createdAt).toLocaleString()})</li>
        ))}
        {lead.messages.map((msg) => (
          <li key={msg.id}>message_{msg.direction.toLowerCase()} - {msg.subject}</li>
        ))}
      </ul>
    </div>
  );
}
