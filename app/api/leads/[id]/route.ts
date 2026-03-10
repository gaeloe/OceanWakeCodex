export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/db";

export async function GET(_: Request, context: { params: { id: string } | Promise<{ id: string }> }) {
  const resolved = await Promise.resolve(context.params);
  const lead = await prisma.lead.findUnique({
    where: { id: resolved.id },
    include: {
      activities: { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { createdAt: "desc" } },
      sequenceRuns: { orderBy: { createdAt: "desc" } },
      suppressions: true,
    },
  });
  if (!lead) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ lead });
}
