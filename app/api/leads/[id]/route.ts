import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
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
