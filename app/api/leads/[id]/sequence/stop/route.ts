import { prisma } from "@/lib/db";

export async function POST(_: Request, context: { params: { id: string } | Promise<{ id: string }> }) {
  const resolved = await Promise.resolve(context.params);
  await prisma.sequenceRun.updateMany({
    where: { leadId: resolved.id, status: { in: ["ACTIVE", "PAUSED"] } },
    data: { status: "STOPPED", stoppedAt: new Date(), stopReason: "manual_stop" },
  });
  return Response.json({ ok: true });
}
